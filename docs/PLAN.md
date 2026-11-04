# PLAN — SesoLibre Mind

App de **ejercicios mentales y puzzles de lógica** cortos, pensada para usarse unos
minutos al día. Bilingüe (**español / inglés**), **offline-first**, web (PWA) y
Android/iOS vía Capacitor. Proyecto independiente de
[sesolibre-games](https://github.com/ellaguno/sesolibre-games), del que hereda stack y
servicios base.

---

## 1. Visión

> "Unos minutos al día para mantener la mente ágil."

- **Sesión diaria** de unos 5 minutos: 3 ejercicios rápidos de habilidades
  distintas + el puzzle del día.
- **Perfil por habilidad** (radar): velocidad, memoria, atención, flexibilidad,
  lógica y lenguaje, con su evolución en el tiempo.
- **Constancia**: racha diaria y calendario de días activos.
- **Reto del día igual para todos** sin servidor: el contenido se genera a partir de
  una semilla derivada de la fecha (`core/rng.ts → dailySeed`).
- **Compartir sin spoilers**: resultado como cuadrícula de emojis + tiempo.
- **Práctica libre**: cualquier actividad, sin límite, con semilla aleatoria.

### Principios

1. **Partidas cortas** (30 s – 3 min). Nada que exija sesiones largas.
2. **Deducción, no azar**: todo puzzle tiene **solución única** demostrada por un
   solver antes de mostrarse.
3. **Determinismo**: generadores puros `f(seed, dificultad) → contenido`; nunca
   `Math.random` dentro de la lógica.
4. **Privacidad**: sin cuentas, sin rastreo; todo se guarda en el dispositivo.
5. **Accesible**: daltonismo (no depender solo del color: formas/patrones), tamaños
   táctiles ≥ 44 px, lectores de pantalla, respeta `prefers-reduced-motion`.

---

## 2. Propiedad intelectual (reglas del proyecto)

Las **mecánicas** de juego no son protegibles; los **nombres, marcas, arte, textos y
puzzles concretos** sí. Por eso:

- ✅ Usamos tipos de puzzle clásicos (Star Battle, Takuzu/Binairo, Shikaku,
  Numbrix/Hidato, Sudoku…) y pruebas neuropsicológicas de dominio público (Stroop,
  Trail Making, span de dígitos, resta seriada, N-back, Corsi…).
- ✅ **Nombres propios** para cada actividad (ver tablas). Todo el contenido lo
  generan nuestros algoritmos.
- ❌ No usar nombres ni identidad visual de terceros: *Queens, Tango, Zip, Patches,
  Wend, Crossclimb, Pinpoint* (LinkedIn), *Brain Age / Dr. Kawashima* (Nintendo),
  *KenKen*, *Picross*, ni el nombre comercial de Nikoli para sus géneros.
- ❌ No copiar puzzles publicados por otros, ni capturas, colores o layouts
  reconocibles de esas apps.
- ⚠️ **Sin promesas médicas.** No decir que la app "mejora el cerebro", "aumenta el
  IQ" o "previene la demencia" (precedente: FTC vs. Lumosity, 2016). Usar
  "ejercita", "mide tu desempeño", "mantente ágil". Evitar el concepto "edad
  cerebral"; en su lugar, **Índice Seso** por habilidad, presentado como
  entretenimiento y comparación contigo mismo.
- Listas de palabras (fase de juegos de palabras): solo de fuentes con licencia
  compatible y verificada (revisar licencia antes de incluir cualquier diccionario).

---

## 3. Catálogo

### Bloque A — Puzzles de lógica

| id | Nombre (es / en) | Género genérico | Regla corta | Fase |
|---|---|---|---|---|
| `crowns` | Coronas / Crowns | Star Battle (1 por unidad) | N×N con N zonas de color; una corona por fila, columna y zona; ninguna se toca, ni en diagonal | **MVP ✅** |
| `sunmoon` | Sol y Luna / Sun & Moon | Takuzu / Binairo | 6×6 u 8×8; igual nº de ☀️ y 🌙 por fila/columna; máximo 2 iguales seguidos; pistas `=` (iguales) y `×` (opuestos) | **MVP ✅** |
| `thread` | Hilo / Thread | Camino hamiltoniano con números (Numbrix/Hidato + paredes) | Un solo trazo que pasa por todas las casillas, visita los números en orden y no cruza paredes | **MVP** |
| `plots` | Parcelas / Plots | Shikaku | Partir la cuadrícula en rectángulos; cada uno contiene un número = su área (y, opcional, su forma: cuadrado/alto/ancho) | **MVP ✅** |
| `minisudoku` | Sudoku mini / Mini Sudoku | Sudoku 6×6 (cajas 2×3) | Clásico, cifras 1–6 | **MVP ✅** |
| `futoshiki` | Mayor que / Greater Than | Futoshiki | Cuadrado latino con desigualdades `<` `>` entre celdas | v2 |
| `calcudoku` | Jaulas / Cages | Calcudoku | Cuadrado latino; cada jaula da su resultado con una operación | v2 |
| `nonogram` | Pixelia | Nonograma | Pintar celdas según pistas de filas/columnas para revelar un dibujo | v2 |
| `lights` | Faroles / Lanterns | Light Up (Akari) | Colocar faroles que iluminen todo sin verse entre sí | v3 |
| `towers` | Rascacielos / Skyline | Skyscrapers | Alturas 1–N; las pistas dicen cuántos edificios se ven desde el borde | v3 |
| `hitori` | Tachar / Strike | Hitori | Tachar repetidos sin aislar regiones ni tachar contiguos | v3 |

### Bloque B — Ejercicios cognitivos (cronometrados)

| id | Nombre (es / en) | Prueba base | Habilidad | Mecánica | Puntuación | Fase |
|---|---|---|---|---|---|---|
| `quickmath` | Cálculo relámpago / Lightning Math | Cálculo simple rápido | Velocidad | 20 operaciones (+ − × ÷ de una cifra); teclado numérico propio | Tiempo + penalización por error | **MVP** |
| `colorclash` | Choque de colores / Color Clash | Stroop | Atención | Palabra de color en tinta distinta; tocar el color de la **tinta**. Opcional: respuesta por voz (Web Speech API) | Tiempo de reacción medio + aciertos | **MVP** |
| `countdown` | Cuenta atrás / Countdown | Resta seriada (100 − 7…) | Memoria de trabajo | Escribir cada resultado sin ver los anteriores | Aciertos consecutivos | **MVP** |
| `numberspan` | Retén la cifra / Number Span | Digit span (directo/inverso) | Memoria | Mostrar dígitos 1 por 1; repetirlos (o al revés). Adaptativo: +1 si aciertas | Longitud máxima | **MVP** |
| `trails` | Sendero / Trails | Trail Making Test A/B | Flexibilidad | Tocar 1→2→3… (A) o 1→A→2→B… (B) dispersos en pantalla | Tiempo | **MVP** |
| `headcount` | ¿Cuántos quedan? / Headcount | Seguimiento atencional | Atención | Figuritas entran y salen de una casa animada; al final, ¿cuántos hay dentro? | Aciertos en 5 rondas | **MVP** |
| `nback` | Eco / Echo | N-back (simple y dual) | Memoria | ¿Coincide con el de hace N pasos? N se adapta | Nivel N alcanzado | v2 |
| `corsi` | Secuencia / Sequence | Bloques de Corsi | Memoria espacial | Repetir el orden en que se encienden bloques | Longitud máxima | v2 |
| `gonogo` | Alto y siga / Stop & Go | Go/No-Go | Control inhibitorio | Tocar solo ante el estímulo objetivo | Aciertos − falsos positivos | v2 |
| `oddone` | El diferente / Odd One | Búsqueda visual | Atención | Encontrar el símbolo distinto en una cuadrícula creciente | Tiempo | v2 |
| `changemaker` | Cambio exacto / Exact Change | Cálculo práctico | Velocidad | Dar el cambio con el menor nº de monedas/billetes | Tiempo | v2 |
| `clock` | ¿Qué hora es? / Clock Reader | Lectura de reloj analógico | Velocidad | Leer la hora (también reflejada / girada en difícil) | Tiempo | v2 |
| `switch` | Cambio de regla / Rule Switch | Task switching | Flexibilidad | Clasificar por color o por forma según una señal que cambia | Tiempo + aciertos | v2 |
| `wordlist` | Recuerda la lista / Word Recall | Recuerdo libre de palabras | Memoria | 2 min para memorizar 20–30 palabras; luego escribir las que recuerdes | Nº recordadas | v3 |
| `syllables` | Sílabas / Syllables | Conteo de sílabas | Lenguaje | ¿Cuántas sílabas tiene la frase? | Tiempo + aciertos | v3 |
| `fluency` | Fluidez / Fluency | Fluidez verbal | Lenguaje | Palabras que empiecen con una letra en 60 s (validación con diccionario) | Nº de palabras válidas | v3 |

### Bloque C — Juegos de palabras (requieren diccionario es/en)

| id | Nombre (es / en) | Género genérico | Regla corta | Fase |
|---|---|---|---|---|
| `serpentine` | Serpentina / Serpentine | Serpiente de letras por regiones | En cada región, trazar un camino por todas sus letras formando una palabra | v3 |
| `ladder` | Escalera / Ladder | Escalera de palabras (Lewis Carroll) + pistas | Ordenar palabras que cambian de una en una letra, guiadas por pistas | v3 |
| `guess` | Atina / Hunch | Adivinar la categoría | Se revelan palabras de una en una; adivinar la categoría con el menor número | v3 (contenido curado) |

> Los juegos de palabras dependen del idioma: necesitan listas de palabras con
> licencia libre **por idioma** y contenido curado. Por eso van después de los de
> lógica pura, que son independientes del idioma.

---

## 4. Sesión diaria e Índice Seso

**Composición** (determinista por fecha):

1. Se eligen 3 ejercicios de **habilidades distintas** con `dailySeed(day, 'session')`.
2. + el **puzzle del día** (rota entre los disponibles; tamaño según el día de la
   semana: lunes fácil → domingo difícil).
3. Al terminar: resumen, actualización del perfil y texto para compartir.

**Índice Seso por habilidad** (0–100, solo contra uno mismo):

- Cada actividad normaliza su resultado a 0–100 con una curva propia (p. ej.,
  tiempo objetivo / tiempo real, acotado).
- Índice de una habilidad = media móvil exponencial de las últimas N sesiones de
  sus actividades.
- Se muestra en radar + tendencia semanal. **Nunca** como "edad" ni comparado con
  normas clínicas.

**Compartir** (sin spoilers):

```
SesoLibre Mind · 4 nov 2026
➗ 0:41  🎨 0:38  🔢 8
👑 Coronas 1:52 ✅
🔥 Racha 12
```

---

## 5. Arquitectura

### Stack (heredado de sesolibre-games)

Vite · React 18 · TypeScript (strict) · Tailwind CSS (tokens claro/oscuro) · React
Router (`HashRouter`) · Zustand · vite-plugin-pwa · Capacitor · Vitest · ESLint +
Prettier.

### Reutilizado de sesolibre-games

| Pieza | Estado |
|---|---|
| Configs (Vite, TS, Tailwind, PostCSS, ESLint, Prettier, `.gitignore`) | Copiado |
| `core/storage.ts` (Preferences nativo / localStorage web) | Copiado tal cual |
| `core/settings.ts` (tema, sonido, animaciones, idioma) | Copiado tal cual |
| `core/AudioService.ts` (sonidos sintetizados WebAudio) | Copiado; sonidos `correct` / `wrong` / `tick` |
| `core/ScoreService.ts` (récords + historial por actividad/variante) | Adaptado al registro de actividades |
| `core/RewardService.ts` | **Reescrito**: racha por días activos, calendario, logros por racha (sin monedas por ahora) |
| `core/i18n.ts` (es/en, `useT`) | Mismo mecanismo, diccionario nuevo + test de paridad de claves |
| `core/format.ts`, `anim/*` (partículas, transición de ruta), `ui/Button`, `ui/Screen` | Copiado |
| `hub/SettingsScreen.tsx` | Copiado |
| Íconos PWA (`public/icons`) | Copiado provisional; **reemplazar por la identidad de Mind** |
| Pendiente de traer | `scripts/build-icons.py`, workflows de CI (`.github/workflows`), plugin Play Games (logros y rankings), `docs/PRIVACY`, `RELEASING`, `PLAY-LISTING`, `MONETIZACION` como plantillas |

### Nuevo en Mind

- `core/rng.ts`: PRNG `mulberry32`, `hashString`, `shuffle`, `pick`, `dateKey`,
  `dailySeed(day, id)`, `randomSeed()`.
- `core/registry.ts`: `ActivityMeta` con `kind` (`exercise` | `puzzle`) y `domain`
  (habilidad). `GameProps` recibe `seed` y `daily`.
- Ruta `#/play/<id>` (práctica) y `#/play/<id>?daily=1` (reto del día).

### Estructura

```
src/
├── core/            # servicios sin UI (storage, settings, i18n, rng, registry, scores, rewards)
├── anim/            # partículas y transiciones
├── ui/              # componentes compartidos
├── hub/             # hub, host de actividades, ajustes (y luego: sesión, perfil, calendario)
├── puzzles/<id>/
│   ├── logic.ts     # tipos + reglas + validación (TS puro)
│   ├── generator.ts # f(rng, size) → puzzle con solución única
│   ├── solver.ts    # resolver / contar soluciones (corta en 2) / pistas
│   └── <Id>Game.tsx # UI
└── exercises/<id>/
    ├── logic.ts     # generación de estímulos f(rng, nivel) + puntuación
    └── <Id>Exercise.tsx
tests/               # Vitest: lógica, generadores, unicidad, i18n
```

### Contrato de un puzzle

```ts
interface PuzzleModule<P, S> {
  generate(rng: Rng, size: number): P;          // garantiza solución única
  solve(p: P, limit?: number): S[];             // devuelve hasta `limit` soluciones
  check(p: P, state: S): Violation[];           // errores en vivo para resaltar
  isComplete(p: P, state: S): boolean;
  hint(p: P, state: S): Hint | null;            // siguiente deducción lógica, con explicación
}
```

**Estrategia de generación** (común): construir una solución válida al azar →
derivar pistas → quitar pistas mientras `solve(p, 2).length === 1` → medir la
dificultad por las técnicas que necesitó el solver. Generación pesada en **Web
Worker** (como el solver de solitario en sesolibre-games). Si hace falta, se puede
precalcular un banco de semillas válidas.

### Contrato de un ejercicio

```ts
interface ExerciseModule<Trial, Answer> {
  trials(rng: Rng, level: number): Trial[];     // estímulos deterministas
  grade(trial: Trial, answer: Answer, ms: number): { correct: boolean; score: number };
  normalize(result: ExerciseResult): number;    // 0–100 para el Índice Seso
}
```

Los tiempos se miden con `performance.now()`. La UI de respuesta es siempre táctil
(teclado numérico propio, botones grandes); la voz es opcional.

---

## 6. Roadmap

### Fase 0 — Base ✅
- [x] Proyecto con stack y `core` de sesolibre-games.
- [x] Registro de actividades (exercise/puzzle + habilidad), hub bilingüe, ajustes.
- [x] RNG determinista + semilla diaria; racha por días activos.
- [x] Tests: storage, rng, rewards, paridad i18n.

### Fase 1 — MVP puzzles
- [x] `crowns`: generador de zonas + solver con conteo de soluciones + UI (tap: ✕, doble tap: 👑; arrastrar para marcar ✕), en Web Worker, tamaños 6–9, reto diario (lunes 6×6 → domingo 9×9), pista, deshacer, compartir.
  - [ ] Pendiente: pistas lógicas explicadas (hoy revela/corrige una corona), auto-✕ opcional al poner corona, guardar partida en curso, modo daltónico (patrones por zona).
- [x] `sunmoon`: generador/solver con pistas `=`/`×`; variantes 6×6, 6×6 difícil y 8×8. El generador sólo acepta tableros que se resuelven **por deducción fila/columna** (nunca hay que adivinar) y la pista explica qué fila o columna obliga el valor. Reto diario: 6×6 lun–jue, 6×6 difícil el viernes, 8×8 el fin de semana.
- [x] `minisudoku`: generador propio 6×6 (cajas 2×3) inspirado en el de sesolibre-games: solución única + resoluble sólo con «único candidato» (fácil) o además «único lugar» (difícil, y se exige que haga falta). Teclado 1–6, notas a lápiz que se limpian solas, teclado físico, pista explicada. Reto diario: fácil lun–jue, difícil vie–dom.
- [x] `plots`: partición aleatoria en rectángulos + pistas con área y (en 6×6 y 7×7) forma; sólo se aceptan tableros resolubles por deducción (celdas comunes a todas las opciones de una pista / celda cubrible por una sola pista). Arrastrar traza, tocar borra; parcelas válidas en color, inválidas rayadas. Reto diario: 6×6 lun–jue, 7×7 vie, 8×8 sin formas el fin de semana.
- [ ] `thread`: camino hamiltoniano aleatorio + paredes + números; verificación de unicidad.
- [x] Componentes comunes (`puzzles/common/`): `PuzzleShell` (encabezado, cronómetro, variantes, victoria, compartir, botones, reglas), `usePuzzleSession` (celdas, deshacer, pistas, victoria), `useWorkerResult` (generación en Web Worker), `boardSeed`.

### Fase 2 — MVP ejercicios + sesión diaria
- [ ] `quickmath`, `colorclash`, `countdown`, `numberspan`, `trails`, `headcount`.
- [ ] Teclado numérico propio y cuenta regresiva 3-2-1 compartidos.
- [ ] Flujo de **sesión diaria** + resumen + texto para compartir.
- [ ] Calendario de constancia.

### Fase 3 — Perfil y pulido
- [ ] Índice Seso por habilidad + radar + tendencia.
- [ ] Tutorial interactivo por actividad (primer uso).
- [ ] Identidad visual propia: ícono, paleta, ilustraciones.
- [ ] Accesibilidad: modo daltónico, etiquetas ARIA, pruebas con TalkBack.

### Fase 4 — Lanzamiento Android
- [ ] Capacitor Android, CI (traer workflows), Play Games (logros/rankings del reto diario).
- [ ] Política de privacidad, ficha de Play Store, notificación local opcional de recordatorio diario.

### Fase 5+ — Expansión
- [ ] Ejercicios v2 (N-back, Corsi, Go/No-Go, búsqueda visual, cambio, reloj, cambio de regla).
- [ ] Puzzles v2/v3 (Futoshiki, Calcudoku, Nonograma, Faroles, Rascacielos, Tachar).
- [ ] Juegos de palabras (requieren diccionarios con licencia libre por idioma).
- [ ] Monetización según `MONETIZACION.md` de sesolibre-games (rewarded para pistas extra; premium sin anuncios). Nunca anuncios durante una actividad.

---

## 7. Calidad

- Tests obligatorios por puzzle: **unicidad de solución** en N semillas, validez de
  la solución, y que `check` detecte cada tipo de violación.
- Tests por ejercicio: determinismo de `trials` y rangos de `normalize`.
- Generación del puzzle diario < 200 ms en un móvil de gama media (si no, banco
  precalculado).
- `npm run lint`, `npm test` y `npm run build` en verde antes de cada commit.
- Conventional commits.
