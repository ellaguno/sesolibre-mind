# Servicio de resultados · `games.sesolibre.com/score/`

Comparación anónima de resultados para las apps de SesoLibre: «mejor que el
X % de lo publicado» y tablas con **3 iniciales**, al estilo de las maquinitas.
Sin cuentas ni datos personales (ver `docs/PRIVACY.md`, «Comparar en línea»).

Un solo archivo PHP (`api.php`) con SQLite. No necesita Composer, ni WordPress,
ni nada más.

## Requisitos

- PHP 7.4 o superior (probado con 8.2) con **PDO SQLite**, que casi todos los
  hostings traen. Si no lo trae, se puede usar MySQL (ver «MySQL» abajo).
- Apache con `.htaccess` (o el equivalente en nginx, ver abajo).
- HTTPS en games.sesolibre.com: la app solo se conecta por HTTPS.

## Instalación (5 minutos)

1. Sube **la carpeta `score/` completa** a la raíz de games.sesolibre.com, de modo que
   quede `https://games.sesolibre.com/score/api.php`. Si el sitio es WordPress no
   pasa nada: WordPress no toca las carpetas que existen de verdad.
2. Copia `config.local.example.php` como **`config.local.php`** y pon una sal
   aleatoria (`php -r "echo bin2hex(random_bytes(32));"`, o cualquier texto
   largo y al azar).
3. Permisos: la carpeta `data/` debe poder escribirla PHP (normalmente `755`; si
   da error, `775`). Ahí se crea `scores.sqlite` sola, en el primer uso.
4. Comprueba que responde, abriendo en el navegador:
   `https://games.sesolibre.com/score/api.php?a=top&app=mind&act=crowns&lvl=6&lang=&scope=all`
   → debe mostrar `{"rows":[]}`.
5. Comprueba que lo privado **no** se puede abrir (debe dar 403 Prohibido):
   - `https://games.sesolibre.com/score/config.local.php`
   - `https://games.sesolibre.com/score/data/scores.sqlite`

Listo: la app ya usa esta dirección (`src/core/online.ts`).

## MySQL (opcional)

Si el hosting no tiene SQLite, crea una base vacía y pon en `config.local.php`:

```php
define('SCORE_DSN', 'mysql:host=localhost;dbname=NOMBRE;charset=utf8mb4');
define('SCORE_DB_USER', 'usuario');
define('SCORE_DB_PASS', 'contraseña');
```

Las tablas se crean solas.

## nginx

Si el servidor es nginx (sin `.htaccess`), bloquea lo privado:

```nginx
location ~ ^/score/(config.*\.php|README\.md|data/) { deny all; }
```

## Probar en local

Con Docker (imagen oficial de WordPress CLI, que trae PHP con SQLite):

```bash
cd server/score && docker run --rm -u $(id -u):$(id -g) -v "$PWD":/app -p 8099:8099 wordpress:cli-php8.2 php -S 0.0.0.0:8099 -t /app
```

Y en la app, un archivo `.env.local` (no se sube a git) con
`VITE_SCORE_API=http://localhost:8099/api.php`. **Bórralo antes de compilar
el APK o el AAB**, o la app apuntaría a tu computadora.

## Mantenimiento

- **Añadir una actividad o un juego:** agrégala en `SCORE_ACTIVITIES`
  (`config.php`) con quién gana (`lower` o `higher`) y el rango plausible.
- **Retirar unas iniciales** que alguien pida quitar: en la base, `DELETE FROM
  scores WHERE ini = 'XXX' AND act = '...' AND day = '...'`.
- **Respaldo:** basta con copiar `data/scores.sqlite`.
