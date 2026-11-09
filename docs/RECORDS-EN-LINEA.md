# Récords en línea: análisis y plan

> Para **SesoLibre Mind** y **SesoLibre Games**. Solo análisis y plan: no hay
> nada implementado todavía.

## 1. Qué queremos

1. **Respaldo y sincronización**: subir los récords y el progreso a un sitio
   web y bajarlos en otro teléfono, o después de reinstalar. No se publican.
2. **Opcional: tabla de mejores marcas**, al estilo de las maquinitas: un
   **apodo** y la puntuación, sin cuenta ni correo.
3. **Confidencialidad ante todo.** Hoy las dos apps no recogen ningún dato y
   así lo dicen la política de privacidad y la sección «Seguridad de los
   datos» de Play. Cualquier cambio debe conservar ese espíritu: opcional,
   anónimo y fácil de borrar.

## 2. Qué datos hay (Mind)

Todo vive hoy en el teléfono (Preferences / localStorage), por perfil:

| Dato | Tamaño aprox. | ¿Personal? |
| --- | --- | --- |
| Récords por actividad y nivel (mejor + últimos 60) | 20–60 KB | No |
| Racha, días activos, logros | < 2 KB | No (hábito de uso) |
| Niveles y pasadas de la escalera | < 1 KB | No |
| Ajustes (tema, idioma, sereno…) | < 1 KB | No |
| Nombre y emoji de cada perfil | < 1 KB | **Sí, puede serlo** («Abuela Tere») |
| Partidas en curso | < 5 KB | No |

Conclusión: **cabe todo en un JSON de menos de 100 KB** y lo único sensible es
el nombre de los perfiles. Games es parecido, con récords por juego y nivel.

## 3. Opciones

### A. Sin servidor: exportar e importar un archivo
- La app genera un archivo `.json` (o un texto/QR) con todo; se guarda o se
  comparte (Drive, WhatsApp a uno mismo, correo) y se importa en el otro
  teléfono.
- ✅ Privacidad total, costo cero, sin cambios en la política.
- ❌ Es manual: no hay tabla de marcas y el respaldo depende de que la persona
  se acuerde de hacerlo.

### B. Servidor propio con código de respaldo y apodo ⭐ recomendada
- **Respaldo cifrado de extremo a extremo.** La app genera un **código de
  respaldo** aleatorio (p. ej. `K7Q2-MX9P-4TRB-8WZD`, 80 bits o más) que se
  muestra una vez para anotarlo o guardarlo. De ese código salen:
  - un **id** (hash del código), con el que el servidor guarda el respaldo;
  - una **clave AES-GCM** (derivada con PBKDF2 o HKDF), con la que la app
    cifra el JSON **antes** de subirlo.

  El servidor solo guarda un bloque ilegible: no sabe de quién es ni qué
  contiene. Para bajarlo en otro teléfono se escribe el código. Es el mismo
  estilo que ya usan los códigos de reto (base32 de Crockford, sin letras
  confundibles).
- **Tabla de marcas, opcional y aparte.** Si la persona la activa, elige un
  **apodo** de 3 a 12 caracteres, como en las maquinitas, y se envía solo
  `{app, actividad, nivel, apodo, marca, fecha}`. Sin correo, sin id del
  dispositivo y sin el nombre del perfil.
- ✅ Funciona en Android y en la web (PWA), igual para Mind y Games. Sin
  cuentas.
- ❌ Hay que mantener un servicio pequeño. Si se pierde el código, se pierde
  el respaldo (es el precio de que nadie más lo pueda leer).

### C. Google Play Juegos (lo que Games ya usa en parte)
- Games ya envía marcas a las **tablas de Play Juegos**. Play también ofrece
  **Partidas guardadas** (Saved Games) para sincronizar.
- ✅ Sin servidor propio; Google se encarga de las cuentas y las trampas obvias.
- ❌ Solo Android (nada en la web) y obliga a iniciar sesión con Google. Las
  tablas muestran el nombre de jugador de Google, no un apodo de la app. En
  Mind, pensado para gente mayor, iniciar sesión es una barrera.

### D. Firebase / Supabase con usuario anónimo
- Lo mismo que B pero en infraestructura de terceros.
- ✅ Rápido de montar.
- ❌ Añade un SDK y un proveedor (más letra chica en la política) y hace
  depender de él; el usuario anónimo se pierde al reinstalar, salvo que se
  combine con el código de B de todos modos.

## 4. Recomendación

**A + B, en fases.** Primero el respaldo por archivo (A): es barato, útil y no
toca la privacidad. Después el servicio propio (B) con respaldo cifrado y, si
se quiere, la tabla de marcas por apodo. En Games, C (Play Juegos) puede
seguir para quien ya lo usa en Android; B lo complementa en la web y en el
respaldo.

## 5. Diseño del servicio (opción B)

**Dónde:** un servicio aparte de la web de sesolibre.com, por ejemplo
`api.sesolibre.com`. Dos caminos razonables:
- **Cloudflare Workers + D1/KV**: gratis para este volumen, sin servidor que
  mantener, HTTPS y límite de peticiones incluidos.
- **PHP + SQLite/MySQL en el hosting actual de sesolibre.com**, si se prefiere
  no sumar proveedores.

**API (JSON, HTTPS):**

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `PUT` | `/v1/backup/{id}` | Guarda o reemplaza el respaldo cifrado (máx. 128 KB) |
| `GET` | `/v1/backup/{id}` | Devuelve el respaldo cifrado |
| `DELETE` | `/v1/backup/{id}` | Lo borra (derecho a borrar, sin pedir nada más) |
| `POST` | `/v1/scores` | Envía una marca `{app, act, level, nick, score, day}` |
| `GET` | `/v1/scores?app=&act=&level=&period=` | Mejores 50 (del día, la semana o siempre) |

- **`{id}`** es el SHA-256 del código. El `PUT` y el `DELETE` exigen además una
  firma HMAC hecha con una segunda clave derivada del código. Sin ella, quien
  adivinara el id no podría sobrescribir el respaldo.
- **El cifrado lo hace la app** con WebCrypto, que funciona en la PWA y en el
  WebView de Android, sin librerías nuevas.
- **Retención:** un respaldo sin uso en 18 meses se borra, y se avisa en la
  política.
- **Sin registros de IP** más allá del límite de peticiones, que se guarda en
  memoria y dura minutos.

**Tabla de marcas, cuidados mínimos:**
- **Apodos:** un filtro de palabras ofensivas (es/en). Se le pone un número
  automático si se repite (`Tere#42`).
- **Trampas:** no hay dinero ni premios, así que basta con lo sencillo:
  - descartar marcas imposibles (más rápidas que el mínimo humano por nivel);
  - limitar a 1 envío por partida y por minuto;
  - hacer que la marca del día use el tablero del día (la semilla es
    conocida), así todos compiten en igualdad.
- **Por idioma:** el Laberinto y el Crucigrama dependen del idioma, así que
  su tabla también.

## 6. Privacidad y Play

- La política de privacidad y la sección **Seguridad de los datos** de Play
  deben actualizarse:
  - **Respaldo:** se puede declarar como datos que el desarrollador **no
    puede leer** (están cifrados), opcionales, transmitidos por HTTPS y
    borrables.
  - **Tabla de marcas:** apodo y actividad en la app, opcional, de uso
    público.
- **Público infantil:** si alguna app se declara para menores de 13, la tabla
  de apodos públicos complica el cumplimiento (COPPA y Familias de Play). Hoy
  Mind está pensada para adultos y mayores: conviene mantenerlo así o dejar
  la tabla desactivada en perfiles marcados como «niño».
- **Todo sigue siendo opcional:** sin activarlo, la app funciona igual que
  ahora, 100 % sin conexión.

## 7. Plan por fases

| Fase | Qué | Esfuerzo aprox. |
| --- | --- | --- |
| 1 | **Exportar/importar respaldo** (archivo y compartir) en Mind, con todos los perfiles; luego en Games | 1–2 días por app |
| 2 | **Servicio de respaldo cifrado** (Worker o PHP) + pantalla «Respaldo en línea» con el código | 3–4 días |
| 3 | **Sincronización automática** opcional al terminar la sesión del día (si hay código y red) | 1–2 días |
| 4 | **Tabla de marcas por apodo** (del día y de siempre), con filtro y límites | 3–5 días |
| 5 | Política de privacidad, Seguridad de los datos y textos en es/en | 1 día |

**Antes de la fase 2, decidir:**
- **Dónde corre el servicio:** Cloudflare o el hosting actual.
- **Si queremos la tabla de marcas o solo el respaldo.** El respaldo solo es
  mucho más simple de explicar en la política.
- **Si en Games se mantiene Play Juegos**, junto con el servicio propio o en
  vez de él.

## 8. Comparar resultados con iniciales (al estilo maquinita)

La forma más anónima de compararse: al terminar, la persona **puede** publicar
su marca con **3 iniciales** que elige (`EDL`, `ABU`, `TIO`), como en las
maquinitas, sin cuenta, correo ni identificador del teléfono.

**Qué se envía:** `{app, actividad, nivel, idioma*, iniciales, marca, pistas, día}`
(*solo en juegos de palabras). Nada más: ni nombre del perfil, ni hora exacta
(solo el día), ni modelo de teléfono.

**Qué se puede mostrar sin exponer a nadie:**

| Vista | Ejemplo | Exposición |
| --- | --- | --- |
| **Percentil** (recomendada para empezar) | «Resolviste Coronas 7×7 más rápido que el 72 % de quienes jugaron hoy» | Ninguna: no aparece ningún nombre |
| **Tabla del día** del puzzle del día (todos juegan el mismo tablero, semilla del día) | Top 20 con iniciales | Baja: 3 letras, se borra cada día |
| **Tabla de siempre** por actividad y nivel | Top 50 con iniciales | Baja-media: las iniciales quedan visibles |
| **Entre amigos** (ya existe sin servidor: los retos con código) | «🏆 Ganaste a ABU» | Ninguna fuera del grupo |

**Riesgos y cómo cubrirlos:**
- *Re-identificación:* en un grupo pequeño (familia, amigos) unas iniciales sí
  identifican a alguien; por eso publicar es siempre **opcional** y por partida,
  y el percentil no muestra nombres.
- *Iniciales ofensivas:* con 3 letras el riesgo es mínimo; una lista corta de
  combinaciones bloqueadas basta.
- *Trampas:* sin dinero ni premios, alcanza con lo del punto 5 (marcas
  imposibles, límite de envíos, tablero del día con semilla conocida).
- *Pistas:* las marcas con pistas se muestran aparte o con 💡, para no mezclarlas.
- *Modo sereno:* sin reloj; sus partidas no entran en tablas de tiempo, o van en
  una tabla «sin prisa» por partidas completadas.

**Ventaja extra:** con suficientes marcas anónimas se pueden **calibrar las
metas** de cada nivel (hoy son estimaciones nuestras) con datos reales: qué es un
tiempo típico, bueno o excelente. Esto también sería la base honesta de
cualquier comparación «por edades», si algún día se pide la edad (opcional, por
rangos como 20–29, 30–39…), cosa que hoy no recomendamos.

**Esfuerzo:** el percentil y la tabla del día son la fase 4 del plan (3–5 días)
y necesitan el servicio de la fase 2 sin el respaldo cifrado: se pueden hacer
antes que el respaldo si se prefiere.
