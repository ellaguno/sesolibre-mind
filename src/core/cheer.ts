import type { TFn } from './i18n';

const CHEERS = 8;

/** Frase de ánimo al terminar (varía con la semilla para no repetir siempre la misma). */
export function cheer(t: TFn, seed: number): string {
  return t(`cheer.${(Math.abs(Math.floor(seed)) % CHEERS) + 1}`);
}
