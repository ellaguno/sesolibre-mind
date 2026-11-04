/**
 * Coronas (género genérico: Star Battle de una estrella).
 *
 * Tablero N×N dividido en N zonas. Hay que colocar N coronas: exactamente una
 * por fila, por columna y por zona, y ninguna puede tocar a otra (tampoco en
 * diagonal).
 *
 * Las celdas se indexan en un array plano: i = fila * N + columna.
 */

export interface CrownsPuzzle {
  size: number;
  /** Zona de cada celda (0..size-1), indexada por celda. */
  regions: number[];
}

/** Estado de una celda en la partida: vacía, marcada con ✕ o con corona. */
export const EMPTY = 0;
export const MARK = 1;
export const CROWN = 2;
export type CellState = typeof EMPTY | typeof MARK | typeof CROWN;

export const rowOf = (size: number, i: number) => Math.floor(i / size);
export const colOf = (size: number, i: number) => i % size;

/** Vecinos ortogonales de una celda (para crecer y conectar zonas). */
export function orthoNeighbors(size: number, i: number): number[] {
  const r = rowOf(size, i);
  const c = colOf(size, i);
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
}

/** ¿Dos celdas distintas se tocan (incluida la diagonal)? */
export function touching(size: number, a: number, b: number): boolean {
  return (
    a !== b &&
    Math.abs(rowOf(size, a) - rowOf(size, b)) <= 1 &&
    Math.abs(colOf(size, a) - colOf(size, b)) <= 1
  );
}

/**
 * Coronas que incumplen alguna regla (comparten fila, columna o zona con otra
 * corona, o la tocan). Sirve para resaltar errores en vivo.
 */
export function conflicts(p: CrownsPuzzle, state: readonly CellState[]): Set<number> {
  const crowns = state.flatMap((s, i) => (s === CROWN ? [i] : []));
  const bad = new Set<number>();
  for (let x = 0; x < crowns.length; x++) {
    for (let y = x + 1; y < crowns.length; y++) {
      const a = crowns[x];
      const b = crowns[y];
      if (
        rowOf(p.size, a) === rowOf(p.size, b) ||
        colOf(p.size, a) === colOf(p.size, b) ||
        p.regions[a] === p.regions[b] ||
        touching(p.size, a, b)
      ) {
        bad.add(a);
        bad.add(b);
      }
    }
  }
  return bad;
}

/**
 * Ayuda del modo sereno: al poner una corona en `cell`, marca con ✕ las casillas
 * vacías donde ya no puede ir ninguna (misma fila, columna o zona, o vecinas).
 */
export function autoMark(
  p: CrownsPuzzle,
  state: readonly CellState[],
  cell: number,
): CellState[] {
  const next = [...state];
  for (let i = 0; i < next.length; i++) {
    if (i === cell || next[i] !== EMPTY) continue;
    if (
      rowOf(p.size, i) === rowOf(p.size, cell) ||
      colOf(p.size, i) === colOf(p.size, cell) ||
      p.regions[i] === p.regions[cell] ||
      touching(p.size, i, cell)
    ) {
      next[i] = MARK;
    }
  }
  return next;
}

/** ¿El tablero está resuelto? (N coronas y ninguna en conflicto). */
export function isSolved(p: CrownsPuzzle, state: readonly CellState[]): boolean {
  const count = state.reduce<number>((n, s) => n + (s === CROWN ? 1 : 0), 0);
  return count === p.size && conflicts(p, state).size === 0;
}

/**
 * Cuenta soluciones (hasta `limit`) por backtracking fila a fila. Como hay una
 * corona por fila, basta con comprobar columna, zona y la columna de la fila
 * anterior (|c - prev| > 1) para la regla de no tocarse.
 * Devuelve las soluciones como columna de la corona en cada fila.
 */
export function solve(p: CrownsPuzzle, limit = 2): number[][] {
  const { size, regions } = p;
  const usedCol = new Array<boolean>(size).fill(false);
  const usedRegion = new Array<boolean>(size).fill(false);
  const cols: number[] = [];
  const found: number[][] = [];

  const place = (r: number): void => {
    if (found.length >= limit) return;
    if (r === size) {
      found.push([...cols]);
      return;
    }
    const prev = r > 0 ? cols[r - 1] : -10;
    for (let c = 0; c < size; c++) {
      if (usedCol[c] || Math.abs(c - prev) <= 1) continue;
      const reg = regions[r * size + c];
      if (usedRegion[reg]) continue;
      usedCol[c] = usedRegion[reg] = true;
      cols.push(c);
      place(r + 1);
      cols.pop();
      usedCol[c] = usedRegion[reg] = false;
      if (found.length >= limit) return;
    }
  };

  place(0);
  return found;
}

/** Celdas con corona de una solución (columna por fila → índices planos). */
export function solutionCells(size: number, cols: readonly number[]): number[] {
  return cols.map((c, r) => r * size + c);
}

/**
 * Pista: primero señala una corona mal puesta; si no hay, la siguiente corona
 * de la solución que falta. (Más adelante: deducciones lógicas explicadas.)
 */
export type Hint = { kind: 'wrong'; cell: number } | { kind: 'place'; cell: number };

export function hint(
  p: CrownsPuzzle,
  solution: readonly number[],
  state: readonly CellState[],
): Hint | null {
  const target = new Set(solutionCells(p.size, solution));
  const wrong = state.findIndex((s, i) => s === CROWN && !target.has(i));
  if (wrong >= 0) return { kind: 'wrong', cell: wrong };
  const missing = [...target].find((i) => state[i] !== CROWN);
  return missing === undefined ? null : { kind: 'place', cell: missing };
}
