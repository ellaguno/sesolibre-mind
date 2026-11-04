import { pick, type Rng } from '../../core/rng';

/** Choque de colores (efecto Stroop): elegir el color de la tinta, no el de la palabra. */

export const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
export type Color = (typeof COLORS)[number];

export const INK: Record<Color, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#ca8a04',
};

export interface Trial {
  word: Color;
  ink: Color;
}

export const COUNT = 20;
export const PENALTY_S = 2;
/** Proporción de ensayos congruentes (palabra = tinta). */
const CONGRUENT = 0.25;

export function trials(rng: Rng, count = COUNT): Trial[] {
  const out: Trial[] = [];
  while (out.length < count) {
    const ink = pick(rng, COLORS);
    const word =
      rng() < CONGRUENT
        ? ink
        : pick(
            rng,
            COLORS.filter((c) => c !== ink),
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
