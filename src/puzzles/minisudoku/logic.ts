/**
 * Sudoku mini: 6×6 con cajas de 2×3 (cifras 1–6) o 4×4 con cajas de 2×2
 * (cifras 1–4, el nivel más básico). Cada fila, columna y caja contiene cada
 * cifra una sola vez.
 *
 * Tablero en array plano (i = fila * n + columna); 0 = vacía. La forma del
 * tablero se deduce de su longitud (16 → 4×4, 36 → 6×6).
 */

export type Grid = number[];
export type UnitKind = 'row' | 'col' | 'box';

export interface Unit {
  kind: UnitKind;
  index: number;
  cells: number[];
}

export interface Spec {
  n: number;
  boxRows: number;
  boxCols: number;
  digits: number[];
  units: Unit[];
  /** Celdas que comparten fila, columna o caja con cada celda. */
  peers: number[][];
  rowOf: (i: number) => number;
  colOf: (i: number) => number;
  boxOf: (i: number) => number;
}

function makeSpec(n: number, boxRows: number, boxCols: number): Spec {
  const rowOf = (i: number) => Math.floor(i / n);
  const colOf = (i: number) => i % n;
  const boxOf = (i: number) =>
    Math.floor(rowOf(i) / boxRows) * (n / boxCols) + Math.floor(colOf(i) / boxCols);
  const units: Unit[] = [];
  for (let k = 0; k < n; k++) {
    units.push({
      kind: 'row',
      index: k,
      cells: Array.from({ length: n }, (_, j) => k * n + j),
    });
    units.push({
      kind: 'col',
      index: k,
      cells: Array.from({ length: n }, (_, j) => j * n + k),
    });
  }
  for (let b = 0; b < n; b++) {
    units.push({
      kind: 'box',
      index: b,
      cells: Array.from({ length: n * n }, (_, i) => i).filter((i) => boxOf(i) === b),
    });
  }
  const peers = Array.from({ length: n * n }, (_, i) => {
    const set = new Set<number>();
    for (const u of units)
      if (u.cells.includes(i)) u.cells.forEach((c) => c !== i && set.add(c));
    return [...set];
  });
  const digits = Array.from({ length: n }, (_, k) => k + 1);
  return { n, boxRows, boxCols, digits, units, peers, rowOf, colOf, boxOf };
}

export const SPEC6 = makeSpec(6, 2, 3);
export const SPEC4 = makeSpec(4, 2, 2);

/** Forma del tablero según su número de celdas. */
export function specFor(cells: number): Spec {
  return cells === 16 ? SPEC4 : SPEC6;
}

// Compatibilidad: constantes del 6×6.
export const N = SPEC6.n;
export const BOX_ROWS = SPEC6.boxRows;
export const BOX_COLS = SPEC6.boxCols;
export const DIGITS = SPEC6.digits;
export const UNITS = SPEC6.units;
export const PEERS = SPEC6.peers;
export const rowOf = SPEC6.rowOf;
export const colOf = SPEC6.colOf;
export const boxOf = SPEC6.boxOf;

export function candidates(grid: readonly number[], i: number): number[] {
  if (grid[i] !== 0) return [];
  const spec = specFor(grid.length);
  const used = new Set(spec.peers[i].map((p) => grid[p]));
  return spec.digits.filter((d) => !used.has(d));
}

/** Celdas cuyo valor se repite en alguna fila, columna o caja. */
export function conflicts(grid: readonly number[]): Set<number> {
  const bad = new Set<number>();
  for (const u of specFor(grid.length).units) {
    const seen = new Map<number, number[]>();
    for (const c of u.cells) {
      const v = grid[c];
      if (v) seen.set(v, [...(seen.get(v) ?? []), c]);
    }
    for (const cells of seen.values())
      if (cells.length > 1) cells.forEach((c) => bad.add(c));
  }
  return bad;
}

export function isSolved(grid: readonly number[]): boolean {
  return grid.every((v) => v !== 0) && conflicts(grid).size === 0;
}

/** Cuenta soluciones (hasta `limit`) por backtracking por la celda más restringida. */
export function countSolutions(grid: readonly number[], limit = 2): number {
  const g = [...grid];
  let count = 0;
  const rec = () => {
    if (count >= limit) return;
    let best = -1;
    let bestCands: number[] = [];
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== 0) continue;
      const cands = candidates(g, i);
      if (cands.length === 0) return;
      if (best < 0 || cands.length < bestCands.length) {
        best = i;
        bestCands = cands;
      }
    }
    if (best < 0) {
      count++;
      return;
    }
    for (const d of bestCands) {
      g[best] = d;
      rec();
      if (count >= limit) break;
    }
    g[best] = 0;
  };
  if (conflicts(g).size === 0) rec();
  return count;
}

/**
 * Técnicas, de menor a mayor dificultad:
 * - naked:  a la celda sólo le cabe una cifra («único candidato»).
 * - hidden: en una fila/columna/caja, una cifra sólo cabe en una celda («único lugar»).
 */
export type Technique = 'naked' | 'hidden';

export interface Deduction {
  cell: number;
  value: number;
  technique: Technique;
  /** Para `hidden`: la unidad donde la cifra sólo cabe en esa celda. */
  unit?: { kind: UnitKind; index: number };
}

/** Siguiente deducción lógica permitida (por defecto, cualquiera). */
export function nextDeduction(
  grid: readonly number[],
  allowed: readonly Technique[] = ['naked', 'hidden'],
): Deduction | null {
  if (allowed.includes('naked')) {
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== 0) continue;
      const c = candidates(grid, i);
      if (c.length === 1) return { cell: i, value: c[0], technique: 'naked' };
    }
  }
  if (allowed.includes('hidden')) {
    const spec = specFor(grid.length);
    for (const u of spec.units) {
      const present = new Set(u.cells.map((c) => grid[c]));
      for (const d of spec.digits) {
        if (present.has(d)) continue;
        const spots = u.cells.filter(
          (c) => grid[c] === 0 && candidates(grid, c).includes(d),
        );
        if (spots.length === 1) {
          return {
            cell: spots[0],
            value: d,
            technique: 'hidden',
            unit: { kind: u.kind, index: u.index },
          };
        }
      }
    }
  }
  return null;
}

/**
 * Resuelve sólo con las técnicas permitidas. Devuelve el tablero resuelto y si
 * hizo falta «único lugar», o null si se atasca.
 */
export function solveByLogic(
  grid: readonly number[],
  allowed: readonly Technique[],
): { grid: Grid; usedHidden: boolean } | null {
  const g = [...grid];
  let usedHidden = false;
  for (;;) {
    if (g.every((v) => v !== 0)) return isSolved(g) ? { grid: g, usedHidden } : null;
    // Siempre se prefiere «único candidato»: sólo cuenta «único lugar» si hace falta.
    const d =
      nextDeduction(g, ['naked']) ??
      (allowed.includes('hidden') ? nextDeduction(g, ['hidden']) : null);
    if (!d) return null;
    if (d.technique === 'hidden') usedHidden = true;
    g[d.cell] = d.value;
  }
}

export type Hint =
  | { kind: 'wrong'; cell: number }
  | { kind: 'place'; cell: number; value: number; deduction: Deduction | null };

/**
 * Pista: corrige primero una cifra equivocada; si no hay, la siguiente
 * deducción (con su explicación); en último caso revela una celda.
 */
export function hint(solution: readonly number[], grid: readonly number[]): Hint | null {
  const wrong = grid.findIndex((v, i) => v !== 0 && v !== solution[i]);
  if (wrong >= 0) return { kind: 'wrong', cell: wrong };
  const d = nextDeduction(grid);
  if (d) return { kind: 'place', cell: d.cell, value: d.value, deduction: d };
  const missing = grid.findIndex((v) => v === 0);
  return missing < 0
    ? null
    : { kind: 'place', cell: missing, value: solution[missing], deduction: null };
}
