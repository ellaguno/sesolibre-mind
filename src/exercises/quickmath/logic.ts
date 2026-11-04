import { pick, randInt, type Rng } from '../../core/rng';

/** Cálculo relámpago: operaciones de una cifra lo más rápido posible. */

export type Op = '+' | '−' | '×' | '÷';

export interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

export const COUNT = 20;
/** Segundos que suma cada error al tiempo final. */
export const PENALTY_S = 5;

export function makeProblem(rng: Rng): Problem {
  const op = pick(rng, ['+', '−', '×', '÷'] as const);
  const x = randInt(rng, 2, 9);
  const y = randInt(rng, 2, 9);
  switch (op) {
    case '+':
      return { a: x, b: y, op, answer: x + y };
    case '−':
      return { a: x + y, b: x, op, answer: y };
    case '×':
      return { a: x, b: y, op, answer: x * y };
    case '÷':
      return { a: x * y, b: x, op, answer: y };
  }
}

export function problems(rng: Rng, count = COUNT): Problem[] {
  const out: Problem[] = [];
  while (out.length < count) {
    const p = makeProblem(rng);
    const prev = out[out.length - 1];
    // Evitar dos iguales seguidos.
    if (prev && prev.a === p.a && prev.b === p.b && prev.op === p.op) continue;
    out.push(p);
  }
  return out;
}

/**
 * Comprueba lo tecleado: 'correct' si coincide, 'wrong' si ya tiene tantas
 * cifras como la respuesta y no coincide, 'pending' si aún puede completarse.
 */
export function check(p: Problem, typed: string): 'correct' | 'wrong' | 'pending' {
  if (typed === String(p.answer)) return 'correct';
  return typed.length >= String(p.answer).length ? 'wrong' : 'pending';
}

export function score(ms: number, errors: number): number {
  return Math.round(ms / 1000 + errors * PENALTY_S);
}
