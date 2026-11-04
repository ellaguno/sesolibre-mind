import { mulberry32, pick, randInt, type Rng } from '../../core/rng';
import {
  rectArea,
  rectCells,
  shapeOf,
  solveByLogic,
  type Clue,
  type PlotsPuzzle,
  type Rect,
} from './logic';

/**
 * Generador de Parcelas.
 *
 * 1. Parte la cuadrícula en rectángulos al azar (barrido desde la primera
 *    celda libre, evitando rectángulos de 1 celda cuando se puede).
 * 2. Pone la pista de cada rectángulo en una celda al azar.
 * 3. Acepta el tablero sólo si se resuelve por deducción (`solveByLogic`); si
 *    no, prueba otras posiciones de pista y, tras varios intentos, otra partición.
 */

export const VARIANTS = [
  { id: '4', size: 4, shapes: true },
  { id: '5', size: 5, shapes: true },
  { id: '6', size: 6, shapes: true },
  { id: '7', size: 7, shapes: true },
  { id: '8', size: 8, shapes: false },
] as const satisfies readonly { id: string; size: number; shapes: boolean }[];
export type Variant = (typeof VARIANTS)[number];

export interface GeneratedPlots {
  puzzle: PlotsPuzzle;
  solution: Rect[];
}

/** Proporción de pistas que muestran la forma cuando la variante usa formas. */
const SHAPE_RATIO = 0.7;
const CLUE_RETRIES = 25;

function randomPartition(rng: Rng, size: number): Rect[] {
  const maxArea = size + 3;
  const used = new Array<boolean>(size * size).fill(false);
  const rects: Rect[] = [];
  for (;;) {
    const start = used.indexOf(false);
    if (start < 0) return rects;
    const r = Math.floor(start / size);
    const c = start % size;
    // Rectángulos que caben desde (r, c) sobre celdas libres.
    const options: Rect[] = [];
    let maxW = 0;
    while (c + maxW < size && !used[r * size + c + maxW]) maxW++;
    for (let w = 1; w <= maxW; w++) {
      for (let h = 1; r + h <= size; h++) {
        const q = { r, c, h, w };
        if (rectCells(size, q).some((i) => used[i])) break;
        if (rectArea(q) <= maxArea) options.push(q);
      }
    }
    const big = options.filter((q) => rectArea(q) >= 2);
    const q = pick(rng, big.length ? big : options);
    rectCells(size, q).forEach((i) => (used[i] = true));
    rects.push(q);
  }
}

function placeClues(rng: Rng, size: number, rects: Rect[], shapes: boolean): Clue[] {
  return rects.map((q) => {
    const cells = rectCells(size, q);
    return {
      cell: cells[randInt(rng, 0, cells.length - 1)],
      area: rectArea(q),
      shape: shapes && rng() < SHAPE_RATIO ? shapeOf(q) : 'any',
    };
  });
}

export function generatePlots(seed: number, variant: Variant): GeneratedPlots {
  const rng = mulberry32(seed);
  const { size, shapes } = variant;
  for (;;) {
    const rects = randomPartition(rng, size);
    for (let k = 0; k < CLUE_RETRIES; k++) {
      const clues = placeClues(rng, size, rects, shapes);
      const solved = solveByLogic({ size, clues });
      if (!solved) continue;
      // Pistas en orden de lectura (y la solución en el mismo orden).
      const order = clues.map((_, i) => i).sort((a, b) => clues[a].cell - clues[b].cell);
      return {
        puzzle: { size, clues: order.map((i) => clues[i]) },
        solution: order.map((i) => solved[i]),
      };
    }
  }
}
