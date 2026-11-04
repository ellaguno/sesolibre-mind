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
