import { useCallback } from 'react';
import { useSettings, type LangSetting } from './settings';

export type Lang = 'es' | 'en';

/** Idioma del sistema operativo (navegador), normalizado a 'es' | 'en'. */
export function detectLang(): Lang {
  if (typeof navigator !== 'undefined') {
    const l = (navigator.language || 'en').toLowerCase();
    if (l.startsWith('es')) return 'es';
  }
  return 'en';
}

export function resolveLang(setting: LangSetting): Lang {
  return setting === 'auto' ? detectLang() : setting;
}

type Dict = Record<string, string>;

const es: Dict = {
  'app.title': 'SesoLibre Mind',
  'hub.tagline': 'Ejercita tu mente unos minutos al día',
  'hub.dailyTitle': 'Sesión del día',
  'hub.dailyDesc': '3 ejercicios rápidos + el puzzle del día · ~5 min',
  'hub.start': 'Empezar',
  'hub.streak': 'Racha: {n} días',
  'hub.exercises': 'Ejercicios',
  'hub.puzzles': 'Puzzles de lógica',
  'hub.footer': 'offline-first · sin cuentas · sin rastreo',
  'nav.settings': 'Ajustes',
  'best.points': 'Mejor: {v}',
  'best.time': 'Mejor tiempo: {v}',
  'best.moves': 'Mejor: {v}',

  'common.back': 'Volver',
  'common.soon': 'Pronto',
  'fmt.moves': '{n} mov',
  'placeholder.notImplemented': 'Esta actividad todavía está en construcción.',

  'settings.title': 'Ajustes',
  'settings.darkTheme': 'Tema oscuro',
  'settings.sound': 'Sonido',
  'settings.animations': 'Animaciones',
  'settings.language': 'Idioma',
  'lang.auto': 'Automático',
  'lang.es': 'Español',
  'lang.en': 'Inglés',

  'hub.dailyChallenge': 'Reto del día',
  'puzzle.daily': 'Del día',
  'puzzle.time': 'Tiempo',
  'puzzle.size': 'Tamaño del tablero',
  'puzzle.generating': 'Generando tablero…',
  'puzzle.undo': 'Deshacer',
  'puzzle.clear': 'Borrar',
  'puzzle.hint': 'Pista',
  'puzzle.new': 'Nuevo tablero',
  'puzzle.solved': '¡Resuelto!',
  'puzzle.hintsUsed': '{n} pistas',
  'puzzle.share': 'Compartir resultado',
  'puzzle.shared': '¡Listo para compartir!',
  'puzzle.howto': 'Cómo se juega',
  'puzzle.cell': 'Fila {r}, columna {c}: {state}',
  'cell.empty': 'vacía',
  'cell.mark': 'marcada',
  'cell.crown': 'corona',
  'crowns.rule1': 'Coloca una corona en cada fila, cada columna y cada zona de color.',
  'crowns.rule2': 'Dos coronas nunca pueden tocarse, ni siquiera en diagonal.',
  'crowns.rule3':
    'Toca una vez para marcar ✕ y dos para poner 👑. Arrastra para marcar varias ✕.',

  'puzzle.hintWrong': 'Esa casilla estaba mal: la vacié.',
  'puzzle.hintReveal': 'Te revelé una casilla.',
  'cell.sun': 'sol',
  'cell.moon': 'luna',
  'cell.given': '(fija)',
  'sunmoon.rule1': 'Llena cada casilla con ☀️ o 🌙.',
  'sunmoon.rule2': 'Cada fila y cada columna lleva tantos ☀️ como 🌙.',
  'sunmoon.rule3':
    'No puede haber más de 2 iguales seguidos, ni en horizontal ni en vertical.',
  'sunmoon.rule4':
    'Las casillas unidas por = son iguales; las unidas por × son opuestas.',
  'sunmoon.rule5':
    'Toca una casilla para alternar: vacía → ☀️ → 🌙. Las grises son fijas.',
  'sunmoon.hintRow': 'Mira la fila {n}: esa casilla solo puede ser {v}.',
  'sunmoon.hintCol': 'Mira la columna {n}: esa casilla solo puede ser {v}.',

  'domain.speed': 'Velocidad',
  'domain.memory': 'Memoria',
  'domain.attention': 'Atención',
  'domain.flexibility': 'Flexibilidad',
  'domain.logic': 'Lógica',
  'domain.language': 'Lenguaje',

  'act.quickmath.title': 'Cálculo relámpago',
  'act.quickmath.desc': 'Resuelve 20 operaciones lo más rápido que puedas.',
  'act.colorclash.title': 'Choque de colores',
  'act.colorclash.desc': 'Elige el color de la tinta, no lo que dice la palabra.',
  'act.countdown.title': 'Cuenta atrás',
  'act.countdown.desc': 'Resta de 7 en 7 sin ver los resultados anteriores.',
  'act.numberspan.title': 'Retén la cifra',
  'act.numberspan.desc': 'Memoriza una serie de dígitos y repítela.',
  'act.trails.title': 'Sendero',
  'act.trails.desc': 'Une 1→A→2→B→3… en orden y sin errores.',
  'act.headcount.title': '¿Cuántos quedan?',
  'act.headcount.desc': 'Cuenta quién entra y quién sale de la casa.',
  'act.crowns.title': 'Coronas',
  'act.crowns.desc': 'Una corona por fila, columna y zona; nunca tocándose.',
  'act.sunmoon.title': 'Sol y Luna',
  'act.sunmoon.desc': 'Equilibra soles y lunas siguiendo las pistas = y ×.',
  'act.thread.title': 'Hilo',
  'act.thread.desc':
    'Traza un camino por todas las casillas pasando por los números en orden.',
  'act.plots.title': 'Parcelas',
  'act.plots.desc': 'Divide la cuadrícula en rectángulos del tamaño indicado.',
  'act.minisudoku.title': 'Sudoku mini',
  'act.minisudoku.desc': 'Sudoku de 6×6 para resolver en un par de minutos.',
};

const en: Dict = {
  'app.title': 'SesoLibre Mind',
  'hub.tagline': 'Exercise your mind a few minutes a day',
  'hub.dailyTitle': "Today's session",
  'hub.dailyDesc': "3 quick exercises + today's puzzle · ~5 min",
  'hub.start': 'Start',
  'hub.streak': 'Streak: {n} days',
  'hub.exercises': 'Exercises',
  'hub.puzzles': 'Logic puzzles',
  'hub.footer': 'offline-first · no accounts · no tracking',
  'nav.settings': 'Settings',
  'best.points': 'Best: {v}',
  'best.time': 'Best time: {v}',
  'best.moves': 'Best: {v}',

  'common.back': 'Back',
  'common.soon': 'Soon',
  'fmt.moves': '{n} moves',
  'placeholder.notImplemented': 'This activity is still under construction.',

  'settings.title': 'Settings',
  'settings.darkTheme': 'Dark theme',
  'settings.sound': 'Sound',
  'settings.animations': 'Animations',
  'settings.language': 'Language',
  'lang.auto': 'Automatic',
  'lang.es': 'Spanish',
  'lang.en': 'English',

  'hub.dailyChallenge': 'Daily challenge',
  'puzzle.daily': 'Daily',
  'puzzle.time': 'Time',
  'puzzle.size': 'Board size',
  'puzzle.generating': 'Generating board…',
  'puzzle.undo': 'Undo',
  'puzzle.clear': 'Clear',
  'puzzle.hint': 'Hint',
  'puzzle.new': 'New board',
  'puzzle.solved': 'Solved!',
  'puzzle.hintsUsed': '{n} hints',
  'puzzle.share': 'Share result',
  'puzzle.shared': 'Ready to share!',
  'puzzle.howto': 'How to play',
  'puzzle.cell': 'Row {r}, column {c}: {state}',
  'cell.empty': 'empty',
  'cell.mark': 'marked',
  'cell.crown': 'crown',
  'crowns.rule1': 'Place one crown in every row, every column and every color region.',
  'crowns.rule2': 'Two crowns can never touch, not even diagonally.',
  'crowns.rule3': 'Tap once to mark ✕ and twice to place 👑. Drag to mark several ✕.',

  'puzzle.hintWrong': 'That cell was wrong, so I cleared it.',
  'puzzle.hintReveal': 'I revealed a cell for you.',
  'cell.sun': 'sun',
  'cell.moon': 'moon',
  'cell.given': '(fixed)',
  'sunmoon.rule1': 'Fill every cell with ☀️ or 🌙.',
  'sunmoon.rule2': 'Each row and each column has as many ☀️ as 🌙.',
  'sunmoon.rule3': 'No more than 2 of the same in a row, horizontally or vertically.',
  'sunmoon.rule4': 'Cells joined by = are the same; cells joined by × are opposite.',
  'sunmoon.rule5': 'Tap a cell to cycle: empty → ☀️ → 🌙. Gray cells are fixed.',
  'sunmoon.hintRow': 'Look at row {n}: that cell can only be {v}.',
  'sunmoon.hintCol': 'Look at column {n}: that cell can only be {v}.',

  'domain.speed': 'Speed',
  'domain.memory': 'Memory',
  'domain.attention': 'Attention',
  'domain.flexibility': 'Flexibility',
  'domain.logic': 'Logic',
  'domain.language': 'Language',

  'act.quickmath.title': 'Lightning Math',
  'act.quickmath.desc': 'Solve 20 problems as fast as you can.',
  'act.colorclash.title': 'Color Clash',
  'act.colorclash.desc': 'Pick the ink color, not what the word says.',
  'act.countdown.title': 'Countdown',
  'act.countdown.desc': 'Subtract 7 at a time without seeing previous answers.',
  'act.numberspan.title': 'Number Span',
  'act.numberspan.desc': 'Memorize a string of digits and repeat it.',
  'act.trails.title': 'Trails',
  'act.trails.desc': 'Connect 1→A→2→B→3… in order, without mistakes.',
  'act.headcount.title': 'Headcount',
  'act.headcount.desc': 'Count who goes in and out of the house.',
  'act.crowns.title': 'Crowns',
  'act.crowns.desc': 'One crown per row, column and region; never touching.',
  'act.sunmoon.title': 'Sun & Moon',
  'act.sunmoon.desc': 'Balance suns and moons following the = and × clues.',
  'act.thread.title': 'Thread',
  'act.thread.desc': 'Draw one path through every cell, visiting the numbers in order.',
  'act.plots.title': 'Plots',
  'act.plots.desc': 'Split the grid into rectangles of the given sizes.',
  'act.minisudoku.title': 'Mini Sudoku',
  'act.minisudoku.desc': 'A 6×6 sudoku you can finish in a couple of minutes.',
};

const STRINGS: Record<Lang, Dict> = { es, en };

/** Claves presentes en un idioma y ausentes en el otro (para el test de i18n). */
export function missingKeys(): { es: string[]; en: string[] } {
  return {
    es: Object.keys(en).filter((k) => !(k in es)),
    en: Object.keys(es).filter((k) => !(k in en)),
  };
}

export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: string, vars?: Vars): string {
  let str = STRINGS[lang][key] ?? STRINGS.es[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) str = str.replace(`{${k}}`, String(vars[k]));
  }
  return str;
}

export type TFn = (key: string, vars?: Vars) => string;

/** Hook reactivo: devuelve `t` ligado al idioma resuelto (ajuste o SO). */
export function useT(): TFn {
  const lang = useSettings((s) => s.lang);
  const resolved = resolveLang(lang);
  return useCallback(
    (key: string, vars?: Vars) => translate(resolved, key, vars),
    [resolved],
  );
}
