/**
 * Sol y Luna (género genérico: Takuzu / Binairo con pistas de relación).
 *
 * Tablero N×N (N par). Cada celda lleva ☀️ o 🌙:
 *  - cada fila y cada columna tiene N/2 de cada uno;
 *  - nunca hay más de 2 iguales seguidos (en horizontal ni en vertical);
 *  - `=` entre dos celdas: son iguales; `×`: son opuestas.
 *
 * Celdas en array plano: i = fila * N + columna. Valores: 0 vacía, 1 sol, 2 luna.
 */

export const EMPTY = 0;
export const SUN = 1;
export const MOON = 2;
export type Cell = typeof EMPTY | typeof SUN | typeof MOON;
export type Value = typeof SUN | typeof MOON;

export type EdgeKind = 'eq' | 'neq';

/** Pista entre dos celdas vecinas; `b` es la de la derecha o la de abajo de `a`. */
export interface Edge {
  a: number;
  b: number;
  kind: EdgeKind;
}

export interface SunMoonPuzzle {
  size: number;
  /** Celdas fijas (0 = libre). */
  givens: Cell[];
  edges: Edge[];
}

export const opposite = (v: Value): Value => (v === SUN ? MOON : SUN);

/** Índices de la fila `r` o de la columna `c`. */
export function lineCells(size: number, kind: 'row' | 'col', k: number): number[] {
  return Array.from({ length: size }, (_, j) =>
    kind === 'row' ? k * size + j : j * size + k,
  );
}

export function allLines(
  size: number,
): { kind: 'row' | 'col'; index: number; cells: number[] }[] {
  const out: { kind: 'row' | 'col'; index: number; cells: number[] }[] = [];
  for (let k = 0; k < size; k++) {
    out.push({ kind: 'row', index: k, cells: lineCells(size, 'row', k) });
    out.push({ kind: 'col', index: k, cells: lineCells(size, 'col', k) });
  }
  return out;
}

/** ¿Una línea completa o parcial respeta conteo y "no 3 seguidos"? */
function lineOk(values: readonly Cell[], half: number): boolean {
  let suns = 0;
  let moons = 0;
  for (let j = 0; j < values.length; j++) {
    const v = values[j];
    if (v === SUN) suns++;
    else if (v === MOON) moons++;
    if (v !== EMPTY && j >= 2 && values[j - 1] === v && values[j - 2] === v) return false;
  }
  return suns <= half && moons <= half;
}

/** Celdas y pistas que incumplen alguna regla (para resaltar errores). */
export function violations(
  p: SunMoonPuzzle,
  state: readonly Cell[],
): { cells: Set<number>; edges: Set<number> } {
  const { size } = p;
  const half = size / 2;
  const cells = new Set<number>();
  for (const line of allLines(size)) {
    const vals = line.cells.map((i) => state[i]);
    // Tres iguales seguidos.
    for (let j = 2; j < size; j++) {
      if (vals[j] !== EMPTY && vals[j] === vals[j - 1] && vals[j] === vals[j - 2]) {
        cells
          .add(line.cells[j])
          .add(line.cells[j - 1])
          .add(line.cells[j - 2]);
      }
    }
    // Demasiados de un tipo en la línea.
    for (const v of [SUN, MOON] as const) {
      if (vals.filter((x) => x === v).length > half) {
        line.cells.forEach((i, j) => vals[j] === v && cells.add(i));
      }
    }
  }
  const edges = new Set<number>();
  p.edges.forEach((e, k) => {
    const va = state[e.a];
    const vb = state[e.b];
    if (va === EMPTY || vb === EMPTY) return;
    if ((e.kind === 'eq') !== (va === vb)) {
      edges.add(k);
      cells.add(e.a).add(e.b);
    }
  });
  return { cells, edges };
}

export function isSolved(p: SunMoonPuzzle, state: readonly Cell[]): boolean {
  return state.every((v) => v !== EMPTY) && violations(p, state).cells.size === 0;
}

/**
 * Completa una línea: devuelve, para cada celda, el valor forzado (igual en
 * todas las completaciones válidas) o EMPTY si hay más de una opción. `null` si
 * la línea no tiene ninguna completación válida.
 */
function solveLine(
  values: readonly Cell[],
  inLineEdges: readonly { j: number; kind: EdgeKind }[], // entre j y j+1
  half: number,
): Cell[] | null {
  const n = values.length;
  const forced: (Cell | -1)[] = new Array(n).fill(-1); // -1: ninguna completación aún
  const cur = [...values];
  const free = values.flatMap((v, j) => (v === EMPTY ? [j] : []));
  let any = false;

  const edgesOk = () =>
    inLineEdges.every(({ j, kind }) => (kind === 'eq') === (cur[j] === cur[j + 1]));

  const rec = (k: number) => {
    if (!lineOk(cur, half)) return;
    if (k === free.length) {
      if (!edgesOk()) return;
      any = true;
      for (let j = 0; j < n; j++) {
        forced[j] = forced[j] === -1 ? cur[j] : forced[j] === cur[j] ? cur[j] : EMPTY;
      }
      return;
    }
    for (const v of [SUN, MOON] as const) {
      cur[free[k]] = v;
      rec(k + 1);
    }
    cur[free[k]] = EMPTY;
  };
  rec(0);
  return any ? (forced as Cell[]) : null;
}

/** Pistas de una línea expresadas como posiciones dentro de la línea. */
function edgesInLine(p: SunMoonPuzzle, cells: readonly number[]) {
  const pos = new Map(cells.map((c, j) => [c, j]));
  return p.edges.flatMap((e) => {
    const ja = pos.get(e.a);
    const jb = pos.get(e.b);
    return ja !== undefined && jb === ja + 1 ? [{ j: ja, kind: e.kind }] : [];
  });
}

export interface Deduction {
  cell: number;
  value: Value;
  line: { kind: 'row' | 'col'; index: number };
}

/**
 * Siguiente deducción lógica: una celda cuyo valor es obligado al analizar una
 * sola fila o columna (con sus pistas). null si no hay o el estado es inválido.
 */
export function nextDeduction(
  p: SunMoonPuzzle,
  state: readonly Cell[],
): Deduction | null {
  const half = p.size / 2;
  for (const line of allLines(p.size)) {
    const vals = line.cells.map((i) => state[i]);
    if (vals.every((v) => v !== EMPTY)) continue;
    const forced = solveLine(vals, edgesInLine(p, line.cells), half);
    if (!forced) return null;
    for (let j = 0; j < forced.length; j++) {
      if (vals[j] === EMPTY && forced[j] !== EMPTY) {
        return {
          cell: line.cells[j],
          value: forced[j] as Value,
          line: { kind: line.kind, index: line.index },
        };
      }
    }
  }
  return null;
}

/**
 * Resuelve sólo por deducción línea a línea (sin tanteo). Devuelve el tablero
 * completo si así se resuelve entero; si no, null. Un puzzle que se resuelve
 * así tiene solución única y nunca obliga a adivinar.
 */
export function solveByLogic(p: SunMoonPuzzle): Cell[] | null {
  const half = p.size / 2;
  const state = [...p.givens];
  const lines = allLines(p.size).map((l) => ({ ...l, edges: edgesInLine(p, l.cells) }));
  let changed = true;
  while (changed) {
    changed = false;
    for (const line of lines) {
      const vals = line.cells.map((i) => state[i]);
      if (vals.every((v) => v !== EMPTY)) continue;
      const forced = solveLine(vals, line.edges, half);
      if (!forced) return null;
      forced.forEach((v, j) => {
        if (vals[j] === EMPTY && v !== EMPTY) {
          state[line.cells[j]] = v;
          changed = true;
        }
      });
    }
  }
  return state.every((v) => v !== EMPTY) && isSolved(p, state) ? state : null;
}

/** Cuenta soluciones (hasta `limit`) por backtracking. Para tests. */
export function countSolutions(p: SunMoonPuzzle, limit = 2): number {
  const { size } = p;
  const half = size / 2;
  const state = [...p.givens];
  let count = 0;
  const byB = new Map<number, Edge[]>();
  for (const e of p.edges) byB.set(e.b, [...(byB.get(e.b) ?? []), e]);

  const okAt = (i: number) => {
    const r = Math.floor(i / size);
    const c = i % size;
    if (
      !lineOk(
        lineCells(size, 'row', r).map((x) => state[x]),
        half,
      )
    )
      return false;
    if (
      !lineOk(
        lineCells(size, 'col', c).map((x) => state[x]),
        half,
      )
    )
      return false;
    for (const e of byB.get(i) ?? []) {
      if (state[e.a] !== EMPTY && (e.kind === 'eq') !== (state[e.a] === state[i]))
        return false;
    }
    return true;
  };

  const rec = (i: number) => {
    if (count >= limit) return;
    if (i === size * size) {
      if (isSolved(p, state)) count++;
      return;
    }
    if (p.givens[i] !== EMPTY) {
      if (okAt(i)) rec(i + 1);
      return;
    }
    for (const v of [SUN, MOON] as const) {
      state[i] = v;
      if (okAt(i)) rec(i + 1);
    }
    state[i] = EMPTY;
  };
  rec(0);
  return count;
}

export type Hint =
  | { kind: 'wrong'; cell: number }
  | { kind: 'place'; cell: number; value: Value; line: Deduction['line'] | null };

/**
 * Pista: primero corrige una celda equivocada; si no hay, la siguiente
 * deducción lógica (con la fila/columna que la justifica); en último caso,
 * revela una celda de la solución.
 */
export function hint(
  p: SunMoonPuzzle,
  solution: readonly Cell[],
  state: readonly Cell[],
): Hint | null {
  const wrong = state.findIndex((v, i) => v !== EMPTY && v !== solution[i]);
  if (wrong >= 0) return { kind: 'wrong', cell: wrong };
  const d = nextDeduction(p, state);
  if (d) return { kind: 'place', cell: d.cell, value: d.value, line: d.line };
  const missing = state.findIndex((v) => v === EMPTY);
  return missing < 0
    ? null
    : { kind: 'place', cell: missing, value: solution[missing] as Value, line: null };
}
