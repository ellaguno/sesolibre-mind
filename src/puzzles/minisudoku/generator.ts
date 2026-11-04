import { mulberry32, shuffle, type Rng } from '../../core/rng';
import {
  N,
  candidates,
  countSolutions,
  solveByLogic,
  type Grid,
  type Technique,
} from './logic';

/**
 * Generador de Sudoku mini.
 *
 * 1. Rellena un tablero completo al azar.
 * 2. Quita cifras en orden aleatorio mientras la solución siga siendo única y
 *    el tablero se resuelva sólo con las técnicas de la dificultad.
 *    - Fácil: sólo «único candidato»; se deja de cavar al llegar a CLUES.easy.
 *    - Difícil: además «único lugar», y se exige que haga falta.
 */

export type Difficulty = 'easy' | 'hard';

export const VARIANTS = [
  { id: 'easy', difficulty: 'easy' },
  { id: 'hard', difficulty: 'hard' },
] as const satisfies readonly { id: string; difficulty: Difficulty }[];

const ALLOWED: Record<Difficulty, Technique[]> = {
  easy: ['naked'],
  hard: ['naked', 'hidden'],
};
/** Pistas mínimas que se dejan en fácil (en difícil se cava hasta donde se pueda). */
const MIN_CLUES_EASY = 14;
const MAX_ATTEMPTS = 20;

export interface GeneratedSudoku {
  givens: Grid;
  solution: Grid;
}

function randomSolution(rng: Rng): Grid {
  const g = new Array<number>(N * N).fill(0);
  const rec = (i: number): boolean => {
    if (i === g.length) return true;
    for (const d of shuffle(rng, candidates(g, i))) {
      g[i] = d;
      if (rec(i + 1)) return true;
    }
    g[i] = 0;
    return false;
  };
  rec(0);
  return g;
}

function dig(rng: Rng, solution: Grid, difficulty: Difficulty): Grid {
  const g = [...solution];
  let clues = g.length;
  for (const i of shuffle(rng, [...g.keys()])) {
    if (difficulty === 'easy' && clues <= MIN_CLUES_EASY) break;
    const v = g[i];
    g[i] = 0;
    if (countSolutions(g, 2) === 1 && solveByLogic(g, ALLOWED[difficulty])) {
      clues--;
    } else {
      g[i] = v;
    }
  }
  return g;
}

export function generateSudoku(
  seed: number,
  difficulty: Difficulty = 'easy',
): GeneratedSudoku {
  const rng = mulberry32(seed);
  let fallback: GeneratedSudoku | null = null;
  for (let k = 0; k < MAX_ATTEMPTS; k++) {
    const solution = randomSolution(rng);
    const givens = dig(rng, solution, difficulty);
    if (difficulty === 'easy') return { givens, solution };
    // Difícil: debe hacer falta «único lugar» (si no, sería un fácil).
    fallback ??= { givens, solution };
    if (solveByLogic(givens, ['naked'])) continue;
    return { givens, solution };
  }
  return fallback!;
}

/** Reto diario: fácil de lunes a jueves, difícil de viernes a domingo. */
export function dailyVariant(date: Date): (typeof VARIANTS)[number] {
  const day = date.getDay();
  return VARIANTS[day === 0 || day >= 5 ? 1 : 0];
}
