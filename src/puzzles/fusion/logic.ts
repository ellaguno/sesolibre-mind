import { mulberry32, type Rng } from '../../core/rng';

/**
 * Fusión: tablero N×N con burbujas numeradas (0 = casilla vacía). Una burbuja
 * se fusiona con una vecina ortogonal del mismo valor: la vecina pasa a valer
 * la suma (el doble) y la casilla de origen queda vacía. Se gana al dejar una
 * sola burbuja.
 */
export type Board = number[];

export interface Move {
  from: number;
  to: number;
}

export const VARIANTS = [
  { id: '3', size: 3, blobs: 5, tries: 12 },
  { id: '4', size: 4, blobs: 8, tries: 8 },
  { id: '5', size: 5, blobs: 12, tries: 6 },
] as const;

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
}

/** Varios candidatos y se queda con el más tramposo. */
export function generateFusion(seed: number, variantId: string): Generated {
  const v = VARIANTS.find((x) => x.id === variantId) ?? VARIANTS[1];
  const rng = mulberry32(seed);
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
