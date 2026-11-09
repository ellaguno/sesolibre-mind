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
];

// Iniciales que no se aceptan (lista corta: con 3 letras el riesgo es mínimo).
const SCORE_BLOCKED_INITIALS = ['ASS', 'FUK', 'FUC', 'KKK', 'NZI', 'SEX', 'XXX', 'CUL', 'PTO', 'PTA', 'VRG', 'KUL'];
