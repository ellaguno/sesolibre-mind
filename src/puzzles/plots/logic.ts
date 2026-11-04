/**
 * Parcelas (género genérico: Shikaku).
 *
 * Hay que dividir la cuadrícula N×N en rectángulos. Cada rectángulo contiene
 * exactamente una pista; el número de la pista es su área y, si la pista
 * indica forma, el rectángulo debe ser cuadrado, alto o ancho.
 *
 * Celdas en array plano: i = fila * N + columna.
 */

export type Shape = 'square' | 'tall' | 'wide' | 'any';

export interface Clue {
  cell: number;
  area: number;
  shape: Shape;
}

export interface PlotsPuzzle {
  size: number;
  clues: Clue[];
}

export interface Rect {
  r: number;
  c: number;
  h: number;
  w: number;
}

export const rectArea = (q: Rect) => q.h * q.w;

export function rectCells(size: number, q: Rect): number[] {
  const out: number[] = [];
  for (let r = q.r; r < q.r + q.h; r++) {
    for (let c = q.c; c < q.c + q.w; c++) out.push(r * size + c);
  }
  return out;
}

export function rectContains(size: number, q: Rect, cell: number): boolean {
  const r = Math.floor(cell / size);
  const c = cell % size;
  return r >= q.r && r < q.r + q.h && c >= q.c && c < q.c + q.w;
}

export function shapeOf(q: Rect): Exclude<Shape, 'any'> {
  return q.h === q.w ? 'square' : q.h > q.w ? 'tall' : 'wide';
}

export function fitsClue(q: Rect, clue: Clue): boolean {
  return rectArea(q) === clue.area && (clue.shape === 'any' || shapeOf(q) === clue.shape);
}

/** Rectángulo mínimo que contiene dos celdas (lo que se traza al arrastrar). */
export function rectBetween(size: number, a: number, b: number): Rect {
  const [ra, ca, rb, cb] = [
    Math.floor(a / size),
    a % size,
    Math.floor(b / size),
    b % size,
  ];
  return {
    r: Math.min(ra, rb),
    c: Math.min(ca, cb),
    h: Math.abs(ra - rb) + 1,
    w: Math.abs(ca - cb) + 1,
  };
}

/** Rectángulos posibles para cada pista: su área/forma, con ella dentro y sin otras pistas. */
export function candidateRects(p: PlotsPuzzle): Rect[][] {
  const { size, clues } = p;
  const clueAt = new Set(clues.map((k) => k.cell));
  return clues.map((clue) => {
    const out: Rect[] = [];
    const cr = Math.floor(clue.cell / size);
    const cc = clue.cell % size;
    for (let h = 1; h <= size; h++) {
      if (clue.area % h !== 0) continue;
      const w = clue.area / h;
      if (w > size) continue;
      for (let r = Math.max(0, cr - h + 1); r <= Math.min(cr, size - h); r++) {
        for (let c = Math.max(0, cc - w + 1); c <= Math.min(cc, size - w); c++) {
          const q = { r, c, h, w };
          if (!fitsClue(q, clue)) continue;
          if (rectCells(size, q).some((i) => i !== clue.cell && clueAt.has(i))) continue;
          out.push(q);
        }
      }
    }
    return out;
  });
}

/** Cuenta soluciones (hasta `limit`) por cobertura exacta con backtracking. Para tests. */
export function countSolutions(p: PlotsPuzzle, limit = 2): number {
  const cands = candidateRects(p);
  const cellSets = cands.map((list) => list.map((q) => rectCells(p.size, q)));
  const used = new Array<boolean>(p.size * p.size).fill(false);
  const done = new Array<boolean>(p.clues.length).fill(false);
  let count = 0;
  const rec = (placed: number) => {
    if (count >= limit) return;
    if (placed === p.clues.length) {
      count++;
      return;
    }
    // Pista con menos opciones compatibles.
    let best = -1;
    let bestOpts: number[][] = [];
    for (let k = 0; k < p.clues.length; k++) {
      if (done[k]) continue;
      const opts = cellSets[k].filter((cells) => cells.every((i) => !used[i]));
      if (opts.length === 0) return;
      if (best < 0 || opts.length < bestOpts.length) {
        best = k;
        bestOpts = opts;
      }
    }
    done[best] = true;
    for (const cells of bestOpts) {
      cells.forEach((i) => (used[i] = true));
      rec(placed + 1);
      cells.forEach((i) => (used[i] = false));
      if (count >= limit) break;
    }
    done[best] = false;
  };
  const total = p.clues.reduce((s, k) => s + k.area, 0);
  if (total === p.size * p.size) rec(0);
  return count;
}

/**
 * Resuelve sólo por deducción, sin tanteo. Reglas, repetidas hasta que no
 * cambie nada:
 *  1. Las celdas comunes a todas las opciones de una pista son suyas: se
 *     descartan las opciones de otras pistas que las pisen.
 *  2. Si una celda sólo puede cubrirla una pista, esa pista debe cubrirla.
 * Devuelve el rectángulo de cada pista si así se resuelve todo; si no, null.
 */
export function solveByLogic(p: PlotsPuzzle): Rect[] | null {
  const n = p.size * p.size;
  const cands = candidateRects(p).map((list) =>
    list.map((q) => ({ q, cells: rectCells(p.size, q) })),
  );
  let changed = true;
  while (changed) {
    changed = false;
    // Regla 1.
    const owner = new Array<number>(n).fill(-1);
    cands.forEach((opts, k) => {
      if (opts.length === 0) return;
      for (const i of opts[0].cells) {
        if (opts.every((o) => o.cells.includes(i))) owner[i] = k;
      }
    });
    cands.forEach((opts, k) => {
      const kept = opts.filter((o) =>
        o.cells.every((i) => owner[i] === -1 || owner[i] === k),
      );
      if (kept.length !== opts.length) {
        cands[k] = kept;
        changed = true;
      }
    });
    if (cands.some((o) => o.length === 0)) return null;
    // Regla 2.
    for (let i = 0; i < n; i++) {
      const who = cands.flatMap((opts, k) =>
        opts.some((o) => o.cells.includes(i)) ? [k] : [],
      );
      if (who.length === 0) return null;
      if (who.length === 1) {
        const k = who[0];
        const kept = cands[k].filter((o) => o.cells.includes(i));
        if (kept.length !== cands[k].length) {
          cands[k] = kept;
          changed = true;
        }
      }
    }
  }
  return cands.every((o) => o.length === 1) ? cands.map((o) => o[0].q) : null;
}

// ---------- Estado de la partida ----------

/**
 * La partida se guarda como el id de parcela de cada celda (0 = sin parcela).
 * Las parcelas siempre son rectángulos porque se trazan como tales y al trazar
 * una nueva se borran enteras las que pisa.
 */
export type Board = number[];

export interface DrawnPlot {
  id: number;
  rect: Rect;
  cells: number[];
  /** Índice de la pista que satisface, o -1 si no es válida. */
  clue: number;
}

export function plotsOf(p: PlotsPuzzle, board: readonly number[]): DrawnPlot[] {
  const byId = new Map<number, number[]>();
  board.forEach((id, i) => id && byId.set(id, [...(byId.get(id) ?? []), i]));
  return [...byId.entries()].map(([id, cells]) => {
    const rows = cells.map((i) => Math.floor(i / p.size));
    const cols = cells.map((i) => i % p.size);
    const rect = {
      r: Math.min(...rows),
      c: Math.min(...cols),
      h: Math.max(...rows) - Math.min(...rows) + 1,
      w: Math.max(...cols) - Math.min(...cols) + 1,
    };
    const inside = p.clues.flatMap((k, idx) => (cells.includes(k.cell) ? [idx] : []));
    const valid =
      cells.length === rectArea(rect) &&
      inside.length === 1 &&
      fitsClue(rect, p.clues[inside[0]]);
    return { id, rect, cells, clue: valid ? inside[0] : -1 };
  });
}

/** Traza un rectángulo: borra las parcelas que pisa y crea una nueva. */
export function drawRect(size: number, board: readonly number[], q: Rect): Board {
  const cells = rectCells(size, q);
  const hit = new Set(cells.map((i) => board[i]).filter(Boolean));
  const id = Math.max(0, ...board) + 1;
  const next = board.map((v) => (hit.has(v) ? 0 : v));
  for (const i of cells) next[i] = id;
  return next;
}

/** Quita la parcela que contiene `cell`. */
export function eraseAt(board: readonly number[], cell: number): Board {
  const id = board[cell];
  return id ? board.map((v) => (v === id ? 0 : v)) : [...board];
}

export function isSolved(p: PlotsPuzzle, board: readonly number[]): boolean {
  if (board.some((v) => v === 0)) return false;
  const plots = plotsOf(p, board);
  return plots.length === p.clues.length && plots.every((d) => d.clue >= 0);
}

export type Hint =
  { kind: 'wrong'; id: number } | { kind: 'place'; clue: number; rect: Rect };

/**
 * Pista: primero quita una parcela que no coincide con la solución; si no hay,
 * coloca la parcela de la pista más restringida que falte.
 */
export function hint(
  p: PlotsPuzzle,
  solution: readonly Rect[],
  board: readonly number[],
): Hint | null {
  const plots = plotsOf(p, board);
  const same = (a: Rect, b: Rect) =>
    a.r === b.r && a.c === b.c && a.h === b.h && a.w === b.w;
  const wrong = plots.find((d) => !solution.some((q) => same(q, d.rect)));
  if (wrong) return { kind: 'wrong', id: wrong.id };
  const cands = candidateRects(p);
  const missing = solution
    .map((q, k) => ({ k, q }))
    .filter(({ q }) => !plots.some((d) => same(d.rect, q)))
    .sort((a, b) => cands[a.k].length - cands[b.k].length);
  return missing.length
    ? { kind: 'place', clue: missing[0].k, rect: missing[0].q }
    : null;
}
