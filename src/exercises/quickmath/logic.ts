import { pick, randInt, type Rng } from '../../core/rng';

/** Cálculo relámpago: operaciones lo más rápido posible, por niveles. */

export type Op = '+' | '−' | '×' | '÷';

export interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

export interface Level {
  count: number;
  ops: readonly Op[];
  /** Rango de los operandos «pequeños». */
  min: number;
  max: number;
  /** Segundos que suma cada error. */
  penalty: number;
  /** Nivel 5: sumas y restas de dos cifras. */
  twoDigits?: boolean;
}

export const LEVELS: Record<string, Level> = {
  '1': { count: 5, ops: ['+'], min: 1, max: 5, penalty: 0 },
  '2': { count: 10, ops: ['+', '−'], min: 1, max: 9, penalty: 2 },
  '3': { count: 15, ops: ['+', '−', '×'], min: 2, max: 6, penalty: 3 },
  '4': { count: 20, ops: ['+', '−', '×', '÷'], min: 2, max: 9, penalty: 5 },
  '5': {
    count: 20,
    ops: ['+', '−', '×', '÷'],
    min: 2,
    max: 9,
    penalty: 5,
    twoDigits: true,
  },
};

export function makeProblem(rng: Rng, lv: Level): Problem {
  const op = pick(rng, lv.ops);
  const x = randInt(rng, lv.min, lv.max);
  const y = randInt(rng, lv.min, lv.max);
  if (lv.twoDigits && (op === '+' || op === '−')) {
    const a = randInt(rng, 11, 89);
    const b = randInt(rng, 11, 89);
    return op === '+' ? { a, b, op, answer: a + b } : { a: a + b, b, op, answer: a };
  }
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

export function problems(rng: Rng, lv: Level = LEVELS['4']): Problem[] {
  const out: Problem[] = [];
  while (out.length < lv.count) {
    const p = makeProblem(rng, lv);
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

export function score(ms: number, errors: number, lv: Level = LEVELS['4']): number {
  return Math.round(ms / 1000 + errors * lv.penalty);
}

/** Nivel superado: como mucho un error. */
export const passed = (errors: number) => errors <= 1;
