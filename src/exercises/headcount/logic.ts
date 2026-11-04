import { randInt, type Rng } from '../../core/rng';

/** ¿Cuántos quedan?: seguir a la gente que entra y sale de una casa. */

export const ROUNDS = 5;

export interface Level {
  rounds: number;
  /** Movimientos de la primera ronda y cuántos se añaden por ronda. */
  baseMoves: number;
  movesPerRound: number;
  /** Personas máximas por movimiento. */
  maxN: number;
  /** ms por movimiento en la primera ronda y cuánto se acelera por ronda. */
  stepMs: number;
  speedUp: number;
  /** Sólo entran (nadie sale): el nivel más básico. */
  onlyIn?: boolean;
}

export const LEVELS: Record<string, Level> = {
  '1': {
    rounds: 3,
    baseMoves: 2,
    movesPerRound: 1,
    maxN: 1,
    stepMs: 1600,
    speedUp: 0,
    onlyIn: true,
  },
  '2': { rounds: 4, baseMoves: 3, movesPerRound: 1, maxN: 2, stepMs: 1400, speedUp: 80 },
  '3': {
    rounds: ROUNDS,
    baseMoves: 4,
    movesPerRound: 2,
    maxN: 3,
    stepMs: 1150,
    speedUp: 140,
  },
};

/** Nivel superado: fallar como mucho una ronda. */
export const passed = (score: number, lv: Level) => score >= lv.rounds - 1;

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

export function makeRound(rng: Rng, r: number, lv: Level = LEVELS['3']): Round {
  const moves: Move[] = [{ dir: 'in', n: randInt(rng, 1, Math.min(3, lv.maxN)) }];
  let inside = moves[0].n;
  const count = lv.baseMoves + r * lv.movesPerRound;
  // En el nivel normal las dos primeras rondas mueven a 1–2 personas.
  const maxN = lv === LEVELS['3'] ? (r >= 2 ? 3 : 2) : lv.maxN;
  while (moves.length < count) {
    const dir = lv.onlyIn || inside === 0 || rng() < 0.5 ? 'in' : 'out';
    const n = randInt(rng, 1, dir === 'out' ? Math.min(maxN, inside) : maxN);
    inside += dir === 'in' ? n : -n;
    moves.push({ dir, n });
  }
  return { moves, stepMs: Math.max(550, lv.stepMs - r * lv.speedUp), answer: inside };
}

export function rounds(rng: Rng, lv: Level = LEVELS['3']): Round[] {
  return Array.from({ length: lv.rounds }, (_, r) => makeRound(rng, r, lv));
}
