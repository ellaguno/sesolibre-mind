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
/** Proporción de ensayos congruentes (palabra = tinta). */
const CONGRUENT = 0.25;

export function trials(
  rng: Rng,
  count = COUNT,
  colors: readonly Color[] = COLORS,
): Trial[] {
  const out: Trial[] = [];
  while (out.length < count) {
    const ink = pick(rng, colors);
    const word =
      rng() < CONGRUENT
        ? ink
        : pick(
            rng,
            colors.filter((c) => c !== ink),
          );
    const prev = out[out.length - 1];
    if (prev && prev.ink === ink && prev.word === word) continue;
    out.push({ word, ink });
  }
  return out;
}

export function score(ms: number, errors: number): number {
  return Math.round(ms / 1000 + errors * PENALTY_S);
}
