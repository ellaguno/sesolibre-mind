import { hashString } from '../../core/rng';

/**
 * Semilla del tablero: la del reto diario tal cual, o derivada de la semilla de
 * la sesión + nº de partida + variante en práctica libre.
 */
export function boardSeed(seed: number, daily: boolean, round: number, variant: string) {
  return daily ? seed : hashString(`${seed}:${round}:${variant}`);
}
