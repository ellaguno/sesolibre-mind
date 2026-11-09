<?php
/**
 * SesoLibre · comparación anónima de resultados (sesolibre.com/score/api.php)
 *
 * Al estilo de las maquinitas: un resultado se publica con 3 iniciales, sin
 * cuenta, correo ni identificador del teléfono. Solo se guarda el día (no la
 * hora). La IP se usa únicamente, como hash con sal, para limitar envíos, y
 * ese registro se borra a los pocos minutos.
 *
 * Acciones (respuesta JSON):
 *   GET  ?a=pct&app=&act=&lvl=&lang=&scope=day|all&day=AAAA-MM-DD&score=N
 *        → {total, pct}  ¿mejor que qué % de lo publicado? (no guarda nada)
 *   POST ?a=submit  {app, act, lvl, lang, ini, score, day, daily}
 *        → {ok, rank, total, pct}
 *   GET  ?a=top&app=&act=&lvl=&lang=&scope=day|all&day=&limit=20
 *        → {rows: [{ini, score}]}
 *
 * «day» = tablas del puzzle del día (mismo tablero para todos ese día);
 * «all» = todas las partidas publicadas de ese nivel.
 * Solo se aceptan partidas sin pistas: así la comparación es pareja.
 *
 * Requiere PHP 7.4+ con PDO (SQLite por defecto, o MySQL en config.local.php).
 */

declare(strict_types=1);

require __DIR__ . '/config.php';

// ---------- CORS: solo las apps (WebView de Android y desarrollo local) ----------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, SCORE_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): void
{
    out(['error' => $msg], $code);
}

// ---------- Base de datos ----------
function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO(SCORE_DSN, SCORE_DB_USER, SCORE_DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    $id = $mysql ? 'BIGINT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $pdo->exec("CREATE TABLE IF NOT EXISTS scores (
        id $id,
        app VARCHAR(16) NOT NULL,
        act VARCHAR(24) NOT NULL,
        lvl VARCHAR(12) NOT NULL,
        lang VARCHAR(2) NOT NULL DEFAULT '',
        scope VARCHAR(3) NOT NULL,
        day CHAR(10) NOT NULL,
        ini CHAR(3) NOT NULL,
        score INT NOT NULL
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS hits (k CHAR(64) NOT NULL, t INT NOT NULL)");
    if (!$mysql) {
        $pdo->exec('CREATE INDEX IF NOT EXISTS ix_board ON scores (app, act, lvl, lang, scope, day, score)');
    } else {
        // MySQL no tiene «IF NOT EXISTS» para índices: se ignora si ya existe.
        try {
            $pdo->exec('CREATE INDEX ix_board ON scores (app, act, lvl, lang, scope, day, score)');
        } catch (PDOException $e) {
        }
    }
    return $pdo;
}

// ---------- Validación ----------
function param(array $src, string $key, string $re): string
{
    $v = isset($src[$key]) ? (string) $src[$key] : '';
    if (!preg_match($re, $v)) fail("parámetro inválido: $key");
    return $v;
}

/** Actividad conocida → ['lower' | 'higher', mínimo plausible, máximo]. */
function activity(string $app, string $act): array
{
    $acts = SCORE_ACTIVITIES[$app] ?? null;
    if (!$acts || !isset($acts[$act])) fail('actividad desconocida');
    return $acts[$act];
}

function board(array $src): array
{
    $b = [
        'app' => param($src, 'app', '/^[a-z]{2,16}$/'),
        'act' => param($src, 'act', '/^[a-z0-9]{2,24}$/'),
        'lvl' => param($src, 'lvl', '/^[A-Za-z0-9]{1,12}$/'),
        'lang' => param($src, 'lang', '/^(|es|en)$/'),
        'scope' => param($src, 'scope', '/^(day|all)$/'),
    ];
    $b['rule'] = activity($b['app'], $b['act']);
    // Las tablas de siempre no dependen del día.
    $b['day'] = $b['scope'] === 'day' ? param($src, 'day', '/^\d{4}-\d{2}-\d{2}$/') : '';
    return $b;
}

/** Condición «peor que $score» según si gana el menor tiempo o la mayor puntuación. */
function worse(array $b): string
{
    return $b['rule'][0] === 'lower' ? 'score > :s' : 'score < :s';
}

function where(): string
{
    return 'app = :app AND act = :act AND lvl = :lvl AND lang = :lang AND scope = :scope AND day = :day';
}

function keys(array $b): array
{
    return [
        ':app' => $b['app'], ':act' => $b['act'], ':lvl' => $b['lvl'],
        ':lang' => $b['lang'], ':scope' => $b['scope'], ':day' => $b['day'],
    ];
}

function stats(array $b, int $score): array
{
    $q = db()->prepare('SELECT COUNT(*) AS n, SUM(CASE WHEN ' . worse($b) . ' THEN 1 ELSE 0 END) AS w FROM scores WHERE ' . where());
    $q->execute(keys($b) + [':s' => $score]);
    $r = $q->fetch();
    $total = (int) $r['n'];
    $worse = (int) $r['w'];
    return ['total' => $total, 'pct' => $total ? (int) floor(100 * $worse / $total) : null];
}

/** Límite de envíos por IP (hash con sal, se purga a los 10 minutos). */
function rateLimit(): void
{
    $now = time();
    $k = hash('sha256', SCORE_SALT . '|' . ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . intdiv($now, 60));
    $db = db();
    $db->prepare('DELETE FROM hits WHERE t < ?')->execute([$now - 600]);
    $q = $db->prepare('SELECT COUNT(*) FROM hits WHERE k = ?');
    $q->execute([$k]);
    if ((int) $q->fetchColumn() >= SCORE_MAX_PER_MINUTE) fail('demasiados envíos; prueba en un minuto', 429);
    $db->prepare('INSERT INTO hits (k, t) VALUES (?, ?)')->execute([$k, $now]);
}

// ---------- Acciones ----------
try {
    $a = $_GET['a'] ?? '';

    if ($a === 'pct') {
        $b = board($_GET);
        $score = (int) param($_GET, 'score', '/^\d{1,6}$/');
        out(stats($b, $score));
    }

    if ($a === 'top') {
        $b = board($_GET);
        $limit = max(1, min(50, (int) ($_GET['limit'] ?? 20)));
        $order = $b['rule'][0] === 'lower' ? 'ASC' : 'DESC';
        $q = db()->prepare('SELECT ini, score FROM scores WHERE ' . where() . " ORDER BY score $order, id ASC LIMIT $limit");
        $q->execute(keys($b));
        out(['rows' => array_map(fn ($r) => ['ini' => $r['ini'], 'score' => (int) $r['score']], $q->fetchAll())]);
    }

    if ($a === 'submit') {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('usa POST', 405);
        $raw = file_get_contents('php://input', false, null, 0, 2048) ?: '';
        $in = json_decode($raw, true);
        if (!is_array($in)) fail('JSON inválido');
        $in['scope'] = !empty($in['daily']) ? 'day' : 'all';
        $b = board($in);
        // El día del puzzle diario debe ser hoy (±1 por los husos horarios).
        if ($b['scope'] === 'day' && abs(strtotime($b['day'] . ' UTC') - strtotime(gmdate('Y-m-d') . ' UTC')) > 86400) {
            fail('día fuera de rango');
        }
        $ini = strtoupper(param($in, 'ini', '/^[A-Za-z]{3}$/'));
        if (in_array($ini, SCORE_BLOCKED_INITIALS, true)) fail('elige otras iniciales');
        $score = (int) param($in, 'score', '/^\d{1,6}$/');
        [, $min, $max] = $b['rule'];
        if ($score < $min || $score > $max) fail('resultado fuera de rango');
        rateLimit();
        db()->prepare('INSERT INTO scores (app, act, lvl, lang, scope, day, ini, score) VALUES (:app, :act, :lvl, :lang, :scope, :day, :ini, :s)')
            ->execute(keys($b) + [':ini' => $ini, ':s' => $score]);
        // Puesto: 1 + cuántos hay estrictamente mejores.
        $better = $b['rule'][0] === 'lower' ? 'score < :s' : 'score > :s';
        $q = db()->prepare("SELECT COUNT(*) FROM scores WHERE " . where() . " AND $better");
        $q->execute(keys($b) + [':s' => $score]);
        $rank = 1 + (int) $q->fetchColumn();
        out(['ok' => true, 'rank' => $rank] + stats($b, $score));
    }

    fail('acción desconocida', 404);
} catch (PDOException $e) {
    error_log('score: ' . $e->getMessage());
    fail('error del servidor', 500);
}
