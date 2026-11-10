<?php
/**
 * Configuración del servicio de resultados. Lo privado (sal, base MySQL) va en
 * config.local.php, que NO se sube al repositorio (ver config.local.example.php).
 */

if (is_file(__DIR__ . '/config.local.php')) {
    require __DIR__ . '/config.local.php';
}

// Base de datos: SQLite en data/ (protegida por .htaccess) salvo que se defina otra.
defined('SCORE_DSN') || define('SCORE_DSN', 'sqlite:' . __DIR__ . '/data/scores.sqlite');
defined('SCORE_DB_USER') || define('SCORE_DB_USER', null);
defined('SCORE_DB_PASS') || define('SCORE_DB_PASS', null);
// Sal para el hash de IP del límite de envíos. Cámbiala en config.local.php.
defined('SCORE_SALT') || define('SCORE_SALT', 'cambia-esta-sal');
defined('SCORE_MAX_PER_MINUTE') || define('SCORE_MAX_PER_MINUTE', 10);

// Orígenes de las apps: WebView de Android (Capacitor) y desarrollo local.
const SCORE_ORIGINS = [
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'http://localhost:5174',
    'http://localhost:5173',
];

/**
 * Actividades admitidas: [quién gana, mínimo plausible, máximo].
 * 'lower' = gana el menor tiempo (segundos); 'higher' = gana la mayor puntuación.
 * Debe coincidir con src/core/registry.ts de cada app.
 */
const SCORE_ACTIVITIES = [
    'mind' => [
        'quickmath' => ['lower', 3, 3600],
        'colorclash' => ['lower', 2, 3600],
        'countdown' => ['higher', 0, 200],
        'numberspan' => ['higher', 0, 30],
        'trails' => ['lower', 2, 3600],
        'headcount' => ['higher', 0, 10],
        'crowns' => ['lower', 2, 36000],
        'sunmoon' => ['lower', 2, 36000],
        'thread' => ['lower', 2, 36000],
        'plots' => ['lower', 2, 36000],
        'minisudoku' => ['lower', 2, 36000],
        'wordmaze' => ['lower', 3, 36000],
        'crossword' => ['lower', 5, 36000],
    ],
    // SesoLibre Games (repo sesolibre-games, src/core/online.ts). «lvl» separa
    // modalidades que no se comparan entre sí:
    //   minesweeper / sudoku / ajedrez: easy | medium | hard (ajedrez = vs IA)
    //   solitaire: d1 | d3 (robar 1 o 3) · figures: limited | free · resto: all
    'games' => [
        'figures' => ['higher', 1, 9999999],
        'glotono' => ['higher', 1, 9999999],
        'bloques' => ['higher', 1, 9999999],
        'minesweeper' => ['lower', 1, 36000], // segundos
        'sudoku' => ['lower', 10, 36000], // segundos
        'solitaire' => ['lower', 20, 5000], // jugadas
        'ajedrez' => ['lower', 3, 2000], // medias jugadas hasta dar mate
    ],
];

// Reportes de personas distintas para ocultar una entrada hasta revisarla.
defined('SCORE_HIDE_AFTER') || define('SCORE_HIDE_AFTER', 2);

// Iniciales que no se aceptan (groserías, insultos y odio en español e inglés):
// una sola lista en blocked-initials.json, que también usa la app
// (src/core/online.ts). Lo que se escape se reporta desde la tabla.
define('SCORE_BLOCKED_INITIALS', json_decode((string) file_get_contents(__DIR__ . '/blocked-initials.json'), true) ?: []);
