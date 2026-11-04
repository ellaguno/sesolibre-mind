import { mulberry32, shuffle, type Rng } from '../../core/rng';
import {
  EMPTY,
  MOON,
  SUN,
  lineCells,
  solveByLogic,
  type Cell,
  type Edge,
  type SunMoonPuzzle,
} from './logic';

/**
 * Generador de Sol y Luna.
 *
 * 1. Rellena un tablero válido al azar.
 * 2. Parte de todas las pistas posibles (cada celda como fija y cada par de
 *    vecinas con su `=` o `×`) y las va quitando en orden aleatorio mientras el
 *    tablero siga resolviéndose sólo por deducción (ver `solveByLogic`).
 * 3. En fácil se devuelven algunas pistas quitadas para suavizarlo.
 */

export type Difficulty = 'easy' | 'hard';

export interface GeneratedSunMoon {
  puzzle: SunMoonPuzzle;
  solution: Cell[];
}

function randomSolution(rng: Rng, size: number): Cell[] {
  const half = size / 2;
  const s = new Array<Cell>(size * size).fill(EMPTY);
  const ok = (i: number) => {
    const r = Math.floor(i / size);
    const c = i % size;
    for (const line of [lineCells(size, 'row', r), lineCells(size, 'col', c)]) {
      const vals = line.map((x) => s[x]);
      if (vals.filter((v) => v === SUN).length > half) return false;
      if (vals.filter((v) => v === MOON).length > half) return false;
      for (let j = 2; j < size; j++) {
        if (vals[j] !== EMPTY && vals[j] === vals[j - 1] && vals[j] === vals[j - 2])
          return false;
      }
    }
    return true;
  };
  const rec = (i: number): boolean => {
    if (i === size * size) return true;
    for (const v of shuffle(rng, [SUN, MOON] as const)) {
      s[i] = v;
      if (ok(i) && rec(i + 1)) return true;
    }
    s[i] = EMPTY;
    return false;
  };
  rec(0);
  return s;
}

type Clue = { type: 'given'; cell: number } | { type: 'edge'; edge: Edge };

function build(
  size: number,
  solution: readonly Cell[],
  clues: readonly Clue[],
): SunMoonPuzzle {
  const givens = new Array<Cell>(size * size).fill(EMPTY);
  const edges: Edge[] = [];
  for (const c of clues) {
    if (c.type === 'given') givens[c.cell] = solution[c.cell];
    else edges.push(c.edge);
  }
  edges.sort((x, y) => x.a - y.a || x.b - y.b);
  return { size, givens, edges };
}

export function generateSunMoon(
  seed: number,
  size: number,
  difficulty: Difficulty = 'easy',
): GeneratedSunMoon {
  if (size % 2 !== 0 || size < 4) throw new RangeError(`size ${size}`);
  const rng = mulberry32(seed);
  const solution = randomSolution(rng, size);

  const all: Clue[] = [];
  for (let i = 0; i < size * size; i++) {
    all.push({ type: 'given', cell: i });
    const r = Math.floor(i / size);
    const c = i % size;
    for (const b of [c < size - 1 ? i + 1 : -1, r < size - 1 ? i + size : -1]) {
      if (b < 0) continue;
      all.push({
        type: 'edge',
        edge: { a: i, b, kind: solution[i] === solution[b] ? 'eq' : 'neq' },
      });
    }
  }

  let kept = shuffle(rng, all);
  const removed: Clue[] = [];
  for (const clue of [...kept]) {
    const without = kept.filter((c) => c !== clue);
    if (solveByLogic(build(size, solution, without))) {
      kept = without;
      removed.push(clue);
    }
  }

  // Fácil: devolver algunas de las pistas quitadas.
  if (difficulty === 'easy') kept = [...kept, ...removed.slice(-Math.round(size * 0.75))];

  return { puzzle: build(size, solution, kept), solution };
}

/** Variantes jugables (con récord propio). */
export const VARIANTS = [
  { id: '4', size: 4, difficulty: 'easy' },
  { id: '6', size: 6, difficulty: 'easy' },
  { id: '6h', size: 6, difficulty: 'hard' },
  { id: '8', size: 8, difficulty: 'hard' },
] as const satisfies readonly { id: string; size: number; difficulty: Difficulty }[];
export type Variant = (typeof VARIANTS)[number];
