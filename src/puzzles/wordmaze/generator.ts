import { mulberry32, shuffle, type Rng } from '../../core/rng';
import { randomHamiltonianPath } from '../thread/generator';
import type { Theme } from '../../words/types';
import { toGridLetters } from '../../words/normalize';
import { edgeKey, solve, type GeneratedWordMaze } from './logic';

/**
 * Generador del Laberinto de palabras.
 *
 * 1. Se elige un tema y un grupo de sus palabras cuyas longitudes suman
 *    exactamente las casillas del tablero.
 * 2. Un camino que pasa por todas las casillas (el mismo de Hilo) se corta en
 *    tramos, uno por palabra, y cada tramo se rellena con su palabra (en un
 *    sentido o en el otro).
 * 3. Mientras exista otra forma de colocar las palabras, se pone una pared en
 *    un paso que la alternativa usa y la nuestra no.
 * 4. Se añaden paredes extra entre palabras (más en los niveles fáciles: dan
 *    guía y forma de laberinto); en el difícil se quitan las que sobran
 *    conservando la solución única.
 */

export const VARIANTS = [
  { id: '4', size: 4, words: [3, 4], maxLen: 6, extra: 0.5, hard: false },
  { id: '5', size: 5, words: [4, 6], maxLen: 7, extra: 0.3, hard: false },
  { id: '6', size: 6, words: [5, 7], maxLen: 8, extra: 0.15, hard: false },
  { id: '7', size: 7, words: [6, 9], maxLen: 8, extra: 0, hard: true },
] as const satisfies readonly {
  id: string;
  size: number;
  words: readonly [number, number];
  maxLen: number;
  extra: number;
  hard: boolean;
}[];
export type Variant = (typeof VARIANTS)[number];

/** Palabras del tema (en letras de tablero) cuyas longitudes suman `total`. */
function pickWords(
  rng: Rng,
  pool: string[][],
  total: number,
  [min, max]: readonly [number, number],
): string[][] | null {
  const list = shuffle(rng, pool);
  const chosen: string[][] = [];
  let budget = 4000; // corta búsquedas sin salida
  const go = (from: number, left: number): boolean => {
    if (--budget < 0) return false;
    if (left === 0) return chosen.length >= min;
    if (chosen.length >= max) return false;
    for (let k = from; k < list.length; k++) {
      const w = list[k];
      if (w.length > left || (left - w.length > 0 && left - w.length < 3)) continue;
      chosen.push(w);
      if (go(k + 1, left - w.length)) return true;
      chosen.pop();
    }
    return false;
  };
  return go(0, total) ? chosen : null;
}

function attempt(
  rng: Rng,
  v: Variant,
  themes: readonly Theme[],
): GeneratedWordMaze | null {
  const n = v.size * v.size;
  const theme = themes[Math.floor(rng() * themes.length)];
  const pool = theme.words
    .map((e) => toGridLetters(e.w))
    .filter((w) => w.length >= 3 && w.length <= v.maxLen);
  const words = pickWords(rng, pool, n, v.words);
  if (!words) return null;

  const path = randomHamiltonianPath(rng, v.size);
  const letters = new Array<string>(n);
  const solution: number[][] = [];
  let at = 0;
  for (const w of words) {
    const seg = path.slice(at, at + w.length);
    at += w.length;
    if (rng() < 0.5) seg.reverse();
    seg.forEach((c, k) => (letters[c] = w[k]));
    solution.push(seg);
  }

  // Pasos de la solución: nunca llevan pared.
  const used = new Set<number>();
  for (const seg of solution)
    for (let k = 1; k < seg.length; k++) used.add(edgeKey(seg[k - 1], seg[k]));

  const walls = new Set<number>();
  for (let guard = 0; guard < 200; guard++) {
    const sols = solve(v.size, letters, walls, words, 2);
    const alt = sols.find((s) => s.some((p, k) => p.join() !== solution[k].join()));
    if (!alt) break;
    const steps = shuffle(
      rng,
      alt.flatMap((p) => p.slice(1).map((c, k) => edgeKey(p[k], c))),
    ).filter((e) => !used.has(e) && !walls.has(e));
    if (!steps.length) return null;
    walls.add(steps[0]);
  }
  if (solve(v.size, letters, walls, words, 2).length !== 1) return null;

  // Bordes entre casillas vecinas de palabras distintas (candidatos a pared).
  const between: number[] = [];
  for (let i = 0; i < n; i++)
    for (const j of [i + 1, i + v.size])
      if ((j === i + 1 && (i + 1) % v.size !== 0) || (j === i + v.size && j < n)) {
        const e = edgeKey(i, j);
        if (!used.has(e) && !walls.has(e)) between.push(e);
      }
  if (v.extra > 0)
    for (const e of shuffle(rng, between)) if (rng() < v.extra) walls.add(e);
  if (v.hard) {
    for (const e of shuffle(rng, [...walls])) {
      walls.delete(e);
      if (solve(v.size, letters, walls, words, 2).length !== 1) walls.add(e);
    }
  }

  return {
    puzzle: {
      size: v.size,
      letters,
      walls: [...walls].map((e) => [Math.floor(e / 4096), e % 4096] as [number, number]),
      words: solution.map((seg) => seg.map((c) => letters[c])),
      theme: theme.name,
    },
    solution,
  };
}

export function generateWordMaze(
  seed: number,
  variant: Variant,
  themes: readonly Theme[],
): GeneratedWordMaze {
  const rng = mulberry32(seed);
  for (let k = 0; k < 200; k++) {
    const g = attempt(rng, variant, themes);
    if (g) return g;
  }
  throw new Error('No se pudo generar el laberinto de palabras');
}
