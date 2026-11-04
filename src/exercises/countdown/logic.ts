import { randInt, type Rng } from '../../core/rng';

/** Cuenta atrás (resta seriada): restar siempre lo mismo sin ver los resultados. */

export const DURATION_S = 60;

export interface Level {
  step: number;
  /** Rango del número inicial. */
  from: number;
  to: number;
  seconds: number;
  /** Restas correctas para considerar el nivel superado. */
  pass: number;
}

export const LEVELS: Record<string, Level> = {
  '1': { step: 1, from: 15, to: 25, seconds: 90, pass: 10 },
  '2': { step: 2, from: 30, to: 50, seconds: 90, pass: 10 },
  '3': { step: 3, from: 80, to: 130, seconds: DURATION_S, pass: 10 },
  '7': { step: 7, from: 80, to: 130, seconds: DURATION_S, pass: 8 },
};

export function startValue(rng: Rng, lv: Level): number {
  // Que no sea múltiplo del paso (para no acabar en 0 fácil); con paso 1 da igual.
  for (;;) {
    const v = randInt(rng, lv.from, lv.to);
    if (lv.step === 1 || v % lv.step !== 0) return v;
  }
}

/** ¿Se puede seguir restando? */
export const canContinue = (current: number, step: number) => current - step >= 0;
