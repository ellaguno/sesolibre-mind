import { type Rng } from '../../core/rng';

/** Sendero (Trail Making): tocar en orden 1→2→3… (A) o 1→A→2→B… (B). */

export type Mode = 'A' | 'B';
export const ITEMS = 16;

export interface Level {
  mode: Mode;
  count: number;
}

export const LEVELS: Record<string, Level> = {
  '5': { mode: 'A', count: 5 },
  '10': { mode: 'A', count: 10 },
  A: { mode: 'A', count: ITEMS },
  B: { mode: 'B', count: ITEMS },
  B20: { mode: 'B', count: 20 },
};

/** Nivel superado: como mucho dos toques equivocados. */
export const passed = (errors: number) => errors <= 2;
export const PENALTY_S = 2;
/** Distancia mínima entre centros (en fracción del lado) y margen al borde. */
const MIN_DIST = 0.19;
/** Con muchos círculos la distancia mínima se reduce para que quepan. */
const minDist = (count: number) => Math.min(MIN_DIST, 0.75 / Math.sqrt(count));
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
      if (pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= minDist(count)))
        pts.push(p);
    }
    if (pts.length === count) return pts;
  }
}

export function score(ms: number, errors: number, penalty = PENALTY_S): number {
  return Math.round(ms / 1000 + errors * penalty);
}
