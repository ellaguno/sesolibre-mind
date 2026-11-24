import { mulberry32, type Rng } from '../../core/rng';

/**
 * Fusión: tablero N×N con burbujas numeradas (0 = casilla vacía).
 *
 * - Clásico (3, 4, 5): una burbuja se fusiona con una vecina ortogonal del
 *   mismo valor; la vecina pasa a valer la suma y el origen queda vacío. Se
 *   gana al dejar una sola burbuja.
 * - Con operaciones (x4, x5): dos vecinas cualesquiera se combinan con + − × ÷
 *   (la resta y la división, siempre del mayor entre el menor, y exactas). Se
 *   gana dejando una sola burbuja que valga la meta.
 */
export type Board = number[];

export interface Move {
  from: number;
  to: number;
}

export type Op = '+' | '-' | '×' | '÷';
export const OPS: readonly Op[] = ['+', '-', '×', '÷'];

export interface Variant {
  id: string;
  size: number;
  blobs: number;
  tries: number;
  /** Con operaciones y meta (si no, sólo iguales que se suman). */
  ops: boolean;
}

// Los nuevos van al final: el índice del nivel viaja en los códigos de reto.
export const VARIANTS: readonly Variant[] = [
  { id: '3', size: 3, blobs: 5, tries: 12, ops: false },
  { id: '4', size: 4, blobs: 8, tries: 8, ops: false },
  { id: '5', size: 5, blobs: 12, tries: 6, ops: false },
  { id: 'x4', size: 4, blobs: 5, tries: 1, ops: true },
  { id: 'x5', size: 5, blobs: 7, tries: 1, ops: true },
];

/** Valor máximo de una burbuja (que quepa en la burbuja y se calcule de cabeza). */
export const MAX_VALUE = 999;

/** Resultado de combinar a y b con op, o null si no se puede. */
export function apply(a: number, b: number, op: Op): number | null {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const r =
    op === '+'
      ? a + b
      : op === '-'
        ? hi - lo
        : op === '×'
          ? a * b
          : hi % lo
            ? 0
            : hi / lo;
  return r > 0 && r <= MAX_VALUE ? r : null;
}

export function neighbors(i: number, n: number): number[] {
  const r = Math.floor(i / n);
  const c = i % n;
  const out: number[] = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

export function canMerge(
  b: readonly number[],
  n: number,
  from: number,
  to: number,
): boolean {
  return (
    from !== to && b[from] > 0 && b[from] === b[to] && neighbors(from, n).includes(to)
  );
}

export function merge(b: readonly number[], from: number, to: number): Board {
  const next = [...b];
  next[to] = b[to] * 2;
  next[from] = 0;
  return next;
}

export const blobCount = (b: readonly number[]) => b.filter((v) => v > 0).length;

export const isSolved = (b: readonly number[]) => blobCount(b) === 1;

export function moves(b: readonly number[], n: number): Move[] {
  const out: Move[] = [];
  b.forEach((v, i) => {
    if (v > 0)
      for (const j of neighbors(i, n)) if (b[j] === v) out.push({ from: i, to: j });
  });
  return out;
}

/**
 * Busca una secuencia de fusiones que deje una sola burbuja (o null si ya no
 * se puede). Memoriza los estados sin salida; `limit` acota la búsqueda.
 */
export function solve(b: readonly number[], n: number, limit = 200_000): Move[] | null {
  const dead = new Set<string>();
  let budget = limit;
  const go = (cur: readonly number[]): Move[] | null => {
    if (isSolved(cur)) return [];
    const key = cur.join(',');
    if (dead.has(key) || --budget < 0) return null;
    for (const m of moves(cur, n)) {
      const rest = go(merge(cur, m.from, m.to));
      if (rest) return [m, ...rest];
    }
    dead.add(key);
    return null;
  };
  return go(b);
}

/**
 * Qué tan tramposo es un tablero: fracción de estados alcanzables desde los
 * que ya no se puede ganar (0 = cualquier orden sirve).
 */
export function trickiness(b: readonly number[], n: number, limit = 30_000): number {
  const memo = new Map<string, boolean>();
  const go = (cur: readonly number[]): boolean => {
    if (isSolved(cur)) return true;
    const key = cur.join(',');
    const known = memo.get(key);
    if (known !== undefined) return known;
    if (memo.size > limit) return true;
    let ok = false;
    for (const m of moves(cur, n)) if (go(merge(cur, m.from, m.to))) ok = true;
    memo.set(key, ok);
    return ok;
  };
  go(b);
  let deadCount = 0;
  for (const ok of memo.values()) if (!ok) deadCount++;
  return memo.size ? deadCount / memo.size : 0;
}

/**
 * Tablero al revés: se parte de una sola burbuja y se divide una burbuja en
 * dos mitades vecinas hasta tener `blobs`. Deshacer esas divisiones es una
 * solución, así que siempre tiene solución.
 */
function split(rng: Rng, n: number, blobs: number): Board | null {
  const total = 2 ** (Math.ceil(Math.log2(blobs)) + 1);
  const b: Board = new Array(n * n).fill(0);
  b[Math.floor(rng() * n * n)] = total;
  while (blobCount(b) < blobs) {
    const options: { i: number; free: number[]; w: number }[] = [];
    b.forEach((v, i) => {
      if (v < 2) return;
      const free = neighbors(i, n).filter((j) => b[j] === 0);
      // Preferir dividir las grandes: más variedad de tamaños.
      if (free.length) options.push({ i, free, w: v * v });
    });
    if (!options.length) return null;
    let x = rng() * options.reduce((s, o) => s + o.w, 0);
    const o = options.find((opt) => (x -= opt.w) < 0) ?? options[options.length - 1];
    const j = o.free[Math.floor(rng() * o.free.length)];
    b[o.i] /= 2;
    b[j] = b[o.i];
  }
  return b;
}

export interface Generated {
  board: Board;
  size: number;
  /** Meta (sólo con operaciones). */
  target?: number;
}

// ---------- Con operaciones ----------

export interface OpMove extends Move {
  op: Op;
  value: number;
}

/** Combinaciones posibles: cada par de vecinas, en ambos sentidos, con cada operación. */
export function opMoves(b: readonly number[], n: number): OpMove[] {
  const out: OpMove[] = [];
  b.forEach((a, from) => {
    if (!a) return;
    for (const to of neighbors(from, n)) {
      if (!b[to]) continue;
      for (const op of OPS) {
        const value = apply(a, b[to], op);
        if (value !== null) out.push({ from, to, op, value });
      }
    }
  });
  return out;
}

export function combine(b: readonly number[], m: OpMove): Board {
  const next = [...b];
  next[m.to] = m.value;
  next[m.from] = 0;
  return next;
}

export const reachedTarget = (b: readonly number[], target: number) =>
  isSolved(b) && b.some((v) => v === target);

/**
 * Busca cómo llegar a la meta. undefined = se agotó la búsqueda sin saberlo
 * (no es lo mismo que «no hay salida»).
 */
export function solveOps(
  b: readonly number[],
  n: number,
  target: number,
  limit = 150_000,
): OpMove[] | null | undefined {
  const dead = new Set<string>();
  let budget = limit;
  const go = (cur: readonly number[]): OpMove[] | null | undefined => {
    if (reachedTarget(cur, target)) return [];
    if (isSolved(cur)) return null;
    const key = cur.join(',');
    if (dead.has(key)) return null;
    if (--budget < 0) return undefined;
    let unknown = false;
    for (const m of opMoves(cur, n)) {
      const rest = go(combine(cur, m));
      if (rest) return [m, ...rest];
      if (rest === undefined) unknown = true;
    }
    if (unknown) return undefined;
    dead.add(key);
    return null;
  };
  return go(b);
}

/** Parte v en dos números que, combinados con alguna operación, dan v. */
function splitValue(rng: Rng, v: number): [number, number] | null {
  const options: [number, number][] = [];
  // Suma y resta: números de una o dos cifras.
  // Pocos «1»: con ×1 y ÷1 cualquier tablero se vuelve fácil.
  if (v >= 4) {
    const b = 2 + Math.floor(rng() * (v - 3));
    options.push([v - b, b]);
  }
  const d = 2 + Math.floor(rng() * 8);
  if (v + d <= 60) options.push([v + d, d]);
  // Multiplicación y división: más interesantes, se ofrecen dos veces.
  const divs: number[] = [];
  for (let k = 2; k * k <= v; k++) if (v % k === 0) divs.push(k);
  if (divs.length) {
    const k = divs[Math.floor(rng() * divs.length)];
    options.push([v / k, k], [v / k, k]);
  }
  const q = 2 + Math.floor(rng() * 3);
  if (v * q <= 60) options.push([v * q, q], [v * q, q]);
  return options.length ? options[Math.floor(rng() * options.length)] : null;
}

function splitOps(rng: Rng, n: number, blobs: number, target: number): Board | null {
  const b: Board = new Array(n * n).fill(0);
  b[Math.floor(rng() * n * n)] = target;
  for (let guard = 0; blobCount(b) < blobs; guard++) {
    if (guard > 200) return null;
    const cells = b.map((_, i) => i).filter((i) => b[i] > 1);
    if (!cells.length) return null;
    const i = cells[Math.floor(rng() * cells.length)];
    const free = neighbors(i, n).filter((j) => b[j] === 0);
    if (!free.length) continue;
    const pair = splitValue(rng, b[i]);
    if (!pair) continue;
    const j = free[Math.floor(rng() * free.length)];
    const [x, y] = rng() < 0.5 ? pair : [pair[1], pair[0]];
    b[i] = x;
    b[j] = y;
  }
  return b;
}

function generateOps(rng: Rng, v: Variant): Generated {
  for (;;) {
    const target = 12 + Math.floor(rng() * (v.size === 4 ? 37 : 61));
    const b = splitOps(rng, v.size, v.blobs, target);
    // Que no empiece ya resuelto con una sola cuenta obvia de todo el tablero.
    if (b && blobCount(b) === v.blobs) return { board: b, size: v.size, target };
  }
}

/** Varios candidatos y se queda con el más tramposo. */
export function generateFusion(seed: number, variantId: string): Generated {
  const v = VARIANTS.find((x) => x.id === variantId) ?? VARIANTS[1];
  const rng = mulberry32(seed);
  if (v.ops) return generateOps(rng, v);
  let best: Board | null = null;
  let bestScore = -1;
  for (let t = 0; t < v.tries * 4 && (t < v.tries || !best); t++) {
    const b = split(rng, v.size, v.blobs);
    if (!b) continue;
    const s = trickiness(b, v.size);
    if (s > bestScore) {
      best = b;
      bestScore = s;
    }
  }
  return { board: best ?? [4, 4, 0, 0, 0, 0, 0, 0, 0], size: best ? v.size : 3 };
}

/** Escalón de tamaño (0, 1, 2…) de un valor: define color y diámetro. */
export const stepOf = (v: number) => Math.max(0, Math.round(Math.log2(v)));
