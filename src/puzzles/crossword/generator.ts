import { mulberry32, shuffle, type Rng } from '../../core/rng';
import type { Theme } from '../../words/types';
import { toGridLetters } from '../../words/normalize';
import type { CrosswordPuzzle, Entry } from './logic';

/**
 * Generador del crucigrama (de palabras cruzadas libres, como en un tablero
 * de Scrabble): palabras de un tema con su pista.
 *
 * Se coloca la palabra más larga y luego, una a una, las demás donde crucen
 * más letras ya puestas, sin tocarse de lado con otras palabras (así no se
 * forman palabras de relleno). Se prueban varios intentos y se queda el que
 * coloca más palabras con más cruces. Al final se recorta al rectángulo usado.
 */

export const VARIANTS = [
  { id: '7', box: 7, words: 5, hard: false },
  { id: '9', box: 9, words: 7, hard: false },
  { id: '11', box: 11, words: 10, hard: true },
] as const satisfies readonly { id: string; box: number; words: number; hard: boolean }[];
export type Variant = (typeof VARIANTS)[number];

type Dir = 'a' | 'd';
interface Placed {
  word: string[];
  clue: string;
  r: number;
  c: number;
  dir: Dir;
}

class Board {
  letters = new Map<number, string>();
  // Dirección de las palabras que ya pasan por cada casilla.
  dirs = new Map<number, Set<Dir>>();
  constructor(readonly size: number) {}
  key = (r: number, c: number) => r * this.size + c;
  at = (r: number, c: number) =>
    r < 0 || c < 0 || r >= this.size || c >= this.size
      ? undefined
      : this.letters.get(this.key(r, c));

  /** Cruces si se puede colocar; -1 si no. */
  fits(word: readonly string[], r: number, c: number, dir: Dir, first: boolean): number {
    const [dr, dc] = dir === 'a' ? [0, 1] : [1, 0];
    const endR = r + dr * (word.length - 1);
    const endC = c + dc * (word.length - 1);
    if (r < 0 || c < 0 || endR >= this.size || endC >= this.size) return -1;
    // Nada pegado justo antes ni justo después.
    if (
      this.at(r - dr, c - dc) !== undefined ||
      this.at(endR + dr, endC + dc) !== undefined
    )
      return -1;
    let crosses = 0;
    for (let k = 0; k < word.length; k++) {
      const rr = r + dr * k;
      const cc = c + dc * k;
      const cur = this.at(rr, cc);
      if (cur !== undefined) {
        if (cur !== word[k] || this.dirs.get(this.key(rr, cc))?.has(dir)) return -1;
        crosses++;
      } else if (
        // Casilla nueva: sin vecinas a los lados (formarían otra palabra).
        this.at(rr + dc, cc + dr) !== undefined ||
        this.at(rr - dc, cc - dr) !== undefined
      ) {
        return -1;
      }
    }
    if (!first && (crosses === 0 || crosses === word.length)) return -1;
    return crosses;
  }

  place(p: Placed) {
    const [dr, dc] = p.dir === 'a' ? [0, 1] : [1, 0];
    p.word.forEach((l, k) => {
      const key = this.key(p.r + dr * k, p.c + dc * k);
      this.letters.set(key, l);
      this.dirs.set(key, new Set([...(this.dirs.get(key) ?? []), p.dir]));
    });
  }
}

function layout(
  rng: Rng,
  pool: { word: string[]; clue: string }[],
  v: Variant,
): { placed: Placed[]; crosses: number } {
  const b = new Board(v.box);
  const list = shuffle(rng, pool);
  // Empieza con una de las largas, en horizontal y centrada.
  list.sort((x, y) => y.word.length - x.word.length);
  const firstIdx = Math.floor(rng() * Math.min(3, list.length));
  const [first] = list.splice(firstIdx, 1);
  const rest = shuffle(rng, list);
  const r0 = Math.floor(v.box / 2);
  const c0 = Math.floor((v.box - first.word.length) / 2);
  if (b.fits(first.word, r0, c0, 'a', true) < 0) return { placed: [], crosses: 0 };
  const placed: Placed[] = [{ ...first, r: r0, c: c0, dir: 'a' }];
  b.place(placed[0]);
  let crosses = 0;

  for (const cand of rest) {
    if (placed.length >= v.words) break;
    let best: { p: Placed; x: number } | null = null;
    // Cruces posibles: cada letra igual ya colocada.
    for (const [key, letter] of b.letters) {
      const r = Math.floor(key / v.box);
      const c = key % v.box;
      cand.word.forEach((l, k) => {
        if (l !== letter) return;
        for (const dir of ['a', 'd'] as const) {
          const pr = dir === 'a' ? r : r - k;
          const pc = dir === 'a' ? c - k : c;
          const x = b.fits(cand.word, pr, pc, dir, false);
          if (x > 0 && (!best || x > best.x || (x === best.x && rng() < 0.3)))
            best = { p: { ...cand, r: pr, c: pc, dir }, x };
        }
      });
    }
    if (best) {
      const { p, x } = best as { p: Placed; x: number };
      b.place(p);
      placed.push(p);
      crosses += x;
    }
  }
  return { placed, crosses };
}

/** Números y entradas a partir de las palabras colocadas, ya recortadas. */
function build(placed: Placed[], box: number, theme: string): CrosswordPuzzle {
  let minR = box;
  let minC = box;
  let maxR = 0;
  let maxC = 0;
  for (const p of placed) {
    const [dr, dc] = p.dir === 'a' ? [0, 1] : [1, 0];
    minR = Math.min(minR, p.r);
    minC = Math.min(minC, p.c);
    maxR = Math.max(maxR, p.r + dr * (p.word.length - 1));
    maxC = Math.max(maxC, p.c + dc * (p.word.length - 1));
  }
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const solution = new Array<string>(rows * cols).fill('');
  const cellsOf = (p: Placed) => {
    const [dr, dc] = p.dir === 'a' ? [0, 1] : [1, 0];
    return p.word.map((_, k) => (p.r - minR + dr * k) * cols + (p.c - minC + dc * k));
  };
  for (const p of placed) cellsOf(p).forEach((cell, k) => (solution[cell] = p.word[k]));

  // Numeración clásica: por orden de lectura, en cada casilla donde empieza algo.
  const starts = [...new Set(placed.map((p) => cellsOf(p)[0]))].sort((a, b) => a - b);
  const num = new Map(starts.map((cell, k) => [cell, k + 1]));
  const entries: Entry[] = placed
    .map((p) => {
      const cells = cellsOf(p);
      return { num: num.get(cells[0])!, dir: p.dir, cells, clue: p.clue };
    })
    .sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === 'a' ? -1 : 1));
  return { rows, cols, solution, entries, theme };
}

export function generateCrossword(
  seed: number,
  variant: Variant,
  themes: readonly Theme[],
): CrosswordPuzzle {
  const rng = mulberry32(seed);
  let best: { placed: Placed[]; crosses: number; theme: string } | null = null;
  for (let t = 0; t < 12; t++) {
    const theme = themes[Math.floor(rng() * themes.length)];
    const pool = theme.words
      .map((e) => ({ word: toGridLetters(e.w), clue: e.c }))
      .filter((e) => e.word.length >= 3 && e.word.length <= variant.box);
    for (let a = 0; a < 25; a++) {
      const l = layout(rng, pool, variant);
      const score = l.placed.length * 100 + l.crosses;
      if (!best || score > best.placed.length * 100 + best.crosses)
        best = { ...l, theme: theme.name };
    }
    if (best && best.placed.length >= variant.words) break;
  }
  if (!best || best.placed.length < 3)
    throw new Error('No se pudo generar el crucigrama');
  return build(best.placed, variant.box, best.theme);
}
