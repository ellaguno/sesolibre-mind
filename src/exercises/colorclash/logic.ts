import { pick, type Rng } from '../../core/rng';

/** Choque de colores (efecto Stroop): elegir el color de la tinta, no el de la palabra. */

export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'pink' | 'black';

/** Tintas clásicas. */
export const COLORS: readonly Color[] = ['red', 'blue', 'green', 'yellow'];
/**
 * Modo daltónico: azul, naranja y rosa pasan la separación para protanopia,
 * deuteranopia y tritanopia (validador de paleta, ΔE ≥ 13 en deutan) y el
 * negro se distingue por luminosidad. Rojo/verde/amarillo no la pasan.
 */
export const COLORS_CB: readonly Color[] = ['blue', 'orange', 'pink', 'black'];

export const INK: Record<Color, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#ca8a04',
  orange: '#ea580c',
  pink: '#db2777',
  black: '#111827',
};

export interface Trial {
  word: Color;
  ink: Color;
}

export const COUNT = 20;
export const PENALTY_S = 2;
/** Proporción de ensayos congruentes (palabra = tinta) por defecto. */
const CONGRUENT = 0.25;

export interface Level {
  /** Cuántas tintas (de la paleta elegida) entran en juego. */
  colors: number;
  count: number;
  /** Proporción de ensayos congruentes: 1 = la palabra siempre coincide. */
  congruent: number;
}

export const LEVELS: Record<string, Level> = {
  '1': { colors: 2, count: 8, congruent: 1 },
  '2': { colors: 3, count: 12, congruent: 0.5 },
  '3': { colors: 4, count: 20, congruent: CONGRUENT },
  '4': { colors: 4, count: 30, congruent: 0.1 },
};

/** Nivel superado: como mucho un error. */
export const passed = (errors: number) => errors <= 1;

export function trials(
  rng: Rng,
  count = COUNT,
  colors: readonly Color[] = COLORS,
  congruent = CONGRUENT,
): Trial[] {
  const out: Trial[] = [];
  while (out.length < count) {
    const ink = pick(rng, colors);
    const word =
      rng() < congruent
        ? ink
        : pick(
            rng,
            colors.filter((c) => c !== ink),
          );
    const prev = out[out.length - 1];
    if (prev && prev.ink === ink && prev.word === word && colors.length > 2) continue;
    out.push({ word, ink });
  }
  return out;
}

export function score(ms: number, errors: number): number {
  return Math.round(ms / 1000 + errors * PENALTY_S);
}
