/**
 * Sudoku mini: 6×6 con cajas de 2 filas × 3 columnas, cifras 1–6.
 * Cada fila, columna y caja contiene cada cifra una sola vez.
 *
 * Tablero en array plano (i = fila * 6 + columna); 0 = vacía.
 */

export const N = 6;
export const BOX_ROWS = 2;
export const BOX_COLS = 3;
export const DIGITS = [1, 2, 3, 4, 5, 6] as const;

export type Grid = number[];
export type UnitKind = 'row' | 'col' | 'box';

export interface Unit {
  kind: UnitKind;
  index: number;
  cells: number[];
}

export const rowOf = (i: number) => Math.floor(i / N);
export const colOf = (i: number) => i % N;
export const boxOf = (i: number) =>
  Math.floor(rowOf(i) / BOX_ROWS) * (N / BOX_COLS) + Math.floor(colOf(i) / BOX_COLS);

export const UNITS: Unit[] = (() => {
  const units: Unit[] = [];
  for (let k = 0; k < N; k++) {
    units.push({
      kind: 'row',
      index: k,
      cells: Array.from({ length: N }, (_, j) => k * N + j),
    });
    units.push({
      kind: 'col',
      index: k,
      cells: Array.from({ length: N }, (_, j) => j * N + k),
    });
  }
  for (let b = 0; b < N; b++) {
    units.push({
      kind: 'box',
      index: b,
      cells: Array.from({ length: N * N }, (_, i) => i).filter((i) => boxOf(i) === b),
    });
  }
  return units;
})();

/** Celdas que comparten fila, columna o caja con cada celda. */
export const PEERS: number[][] = Array.from({ length: N * N }, (_, i) => {
  const set = new Set<number>();
  for (const u of UNITS)
    if (u.cells.includes(i)) u.cells.forEach((c) => c !== i && set.add(c));
  return [...set];
});

export function candidates(grid: readonly number[], i: number): number[] {
  if (grid[i] !== 0) return [];
  const used = new Set(PEERS[i].map((p) => grid[p]));
  return DIGITS.filter((d) => !used.has(d));
}

/** Celdas cuyo valor se repite en alguna fila, columna o caja. */
export function conflicts(grid: readonly number[]): Set<number> {
  const bad = new Set<number>();
  for (const u of UNITS) {
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
    for (const u of UNITS) {
      const present = new Set(u.cells.map((c) => grid[c]));
      for (const d of DIGITS) {
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
