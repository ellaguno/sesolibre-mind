import { type Rng } from '../../core/rng';

/** Sendero (Trail Making): tocar en orden 1→2→3… (A) o 1→A→2→B… (B). */

export type Mode = 'A' | 'B';
export const ITEMS = 16;
export const PENALTY_S = 2;
/** Distancia mínima entre centros (en fracción del lado) y margen al borde. */
const MIN_DIST = 0.19;
const MARGIN = 0.08;

export function labels(mode: Mode, count = ITEMS): string[] {
  if (mode === 'A') return Array.from({ length: count }, (_, i) => String(i + 1));
  const out: string[] = [];
  for (let i = 0; out.length < count; i++) {
    out.push(String(i + 1));
    if (out.length < count) out.push(String.fromCharCode(65 + i));
  }
  return out;
}

export interface Point {
  x: number;
  y: number;
}

/** Posiciones aleatorias separadas entre sí (muestreo con rechazo). */
export function positions(rng: Rng, count = ITEMS): Point[] {
  for (;;) {
    const pts: Point[] = [];
    let tries = 0;
    while (pts.length < count && tries < 5000) {
      tries++;
      const p = {
        x: MARGIN + rng() * (1 - 2 * MARGIN),
        y: MARGIN + rng() * (1 - 2 * MARGIN),
      };
      if (pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= MIN_DIST)) pts.push(p);
    }
    if (pts.length === count) return pts;
  }
}

export function score(ms: number, errors: number): number {
  return Math.round(ms / 1000 + errors * PENALTY_S);
}
