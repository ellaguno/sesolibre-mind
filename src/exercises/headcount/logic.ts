import { randInt, type Rng } from '../../core/rng';

/** ¿Cuántos quedan?: seguir a la gente que entra y sale de una casa. */

export const ROUNDS = 5;

export interface Move {
  dir: 'in' | 'out';
  n: number;
}

export interface Round {
  moves: Move[];
  /** Milisegundos por movimiento (más rápido en rondas altas). */
  stepMs: number;
  answer: number;
}

export function makeRound(rng: Rng, r: number): Round {
  const moves: Move[] = [{ dir: 'in', n: randInt(rng, 1, 3) }];
  let inside = moves[0].n;
  const count = 4 + r * 2;
  const maxN = r >= 2 ? 3 : 2;
  while (moves.length < count) {
    const dir = inside === 0 || rng() < 0.5 ? 'in' : 'out';
    const n = randInt(rng, 1, dir === 'out' ? Math.min(maxN, inside) : maxN);
    inside += dir === 'in' ? n : -n;
    moves.push({ dir, n });
  }
  return { moves, stepMs: Math.max(550, 1150 - r * 140), answer: inside };
}

export function rounds(rng: Rng, count = ROUNDS): Round[] {
  return Array.from({ length: count }, (_, r) => makeRound(rng, r));
}
