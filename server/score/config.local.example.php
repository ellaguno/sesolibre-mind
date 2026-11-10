<?php
// Copia este archivo como config.local.php en el servidor (no se sube a git).

// Sal larga y aleatoria para el hash de IP del límite de envíos.
// Genera una con:  php -r "echo bin2hex(random_bytes(32));"
define('SCORE_SALT', 'pega-aqui-una-sal-aleatoria');

// Opcional: usar MySQL (p. ej. la misma base del hosting) en vez de SQLite.
// define('SCORE_DSN', 'mysql:host=localhost;dbname=sesolibre_score;charset=utf8mb4');
// define('SCORE_DB_USER', 'usuario');
// define('SCORE_DB_PASS', 'contraseña');

// Moderación: clave larga y aleatoria para ?a=admin (ver README). Sin ella, el
// panel queda desactivado. Genera una con: openssl rand -hex 24
// define('SCORE_ADMIN_TOKEN', 'pega-aqui-otra-clave-aleatoria');
