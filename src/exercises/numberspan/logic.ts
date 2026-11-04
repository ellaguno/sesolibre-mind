import { randInt, type Rng } from '../../core/rng';

/** Retén la cifra (span de dígitos): repetir una serie que se muestra de una en una. */

export const START_LENGTH = 3;
export const MAX_LENGTH = 12;
/** Fallos permitidos antes de terminar. */
export const STRIKES = 2;
export const SHOW_MS = 900;
export const GAP_MS = 250;

export type Mode = 'forward' | 'backward';

export interface Level {
  start: number;
  mode: Mode;
}

export const LEVELS: Record<string, Level> = {
  '2': { start: 2, mode: 'forward' },
  forward: { start: START_LENGTH, mode: 'forward' },
  backward: { start: START_LENGTH, mode: 'backward' },
};

/** Nivel superado: llegar a dos cifras más que el inicio. */
export const passed = (best: number, lv: Level) => best >= lv.start + 2;

export function sequence(rng: Rng, length: number): number[] {
  const out: number[] = [];
  while (out.length < length) {
    const d = randInt(rng, 0, 9);
    if (d !== out[out.length - 1]) out.push(d);
  }
  return out;
}

/** Respuesta esperada según el modo. */
export function expected(seq: readonly number[], mode: Mode): string {
  return (mode === 'forward' ? seq : [...seq].reverse()).join('');
}
