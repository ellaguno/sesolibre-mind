import { randInt, type Rng } from '../../core/rng';

/** Cuenta atrás (resta seriada): restar siempre lo mismo sin ver los resultados. */

export const DURATION_S = 60;
export const STEPS = [7, 3] as const;

export function startValue(rng: Rng, step: number): number {
  // Que dé para muchas restas y no sea múltiplo del paso (para no acabar en 0 fácil).
  for (;;) {
    const v = randInt(rng, 80, 130);
    if (v % step !== 0) return v;
  }
}

/** ¿Se puede seguir restando? */
export const canContinue = (current: number, step: number) => current - step >= 0;
