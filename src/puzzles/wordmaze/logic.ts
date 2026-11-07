/**
 * Laberinto de palabras: las palabras de un tema serpentean por la cuadrícula
 * (casillas vecinas en horizontal o vertical, sin cruzar paredes) y entre
 * todas usan cada letra exactamente una vez. Se ve cuántas letras tiene cada
 * palabra, no cuál es.
 */

export interface WordMazePuzzle {
  size: number;
  /** Letra de cada casilla (mayúsculas, sin acentos; la Ñ se conserva). */
  letters: string[];
  walls: [number, number][];
  /** Palabras en el orden de la solución, ya en letras de tablero. */
  words: string[][];
  /** Nombre del tema en el idioma de la partida. */
  theme: string;
}

export interface GeneratedWordMaze {
  puzzle: WordMazePuzzle;
  /** Recorrido de cada palabra (mismo orden que `words`). */
  solution: number[][];
}

export const edgeKey = (a: number, b: number) => (a < b ? a * 4096 + b : b * 4096 + a);

export function wallSet(walls: readonly [number, number][]): Set<number> {
  return new Set(walls.map(([a, b]) => edgeKey(a, b)));
}

export function neighbors(size: number, walls: ReadonlySet<number>, i: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out.filter((j) => !walls.has(edgeKey(i, j)));
}

/** ¿Son vecinas `a` y `b` sin pared entre ellas? */
export function linked(size: number, walls: ReadonlySet<number>, a: number, b: number) {
  return neighbors(size, walls, a).includes(b);
}

/** Todos los recorridos simples que deletrean `word` (respetando paredes). */
export function pathsFor(
  size: number,
  letters: readonly string[],
  walls: ReadonlySet<number>,
  word: readonly string[],
): number[][] {
  const out: number[][] = [];
  const path: number[] = [];
  const used = new Uint8Array(size * size);
  const go = (cell: number) => {
    path.push(cell);
    used[cell] = 1;
    if (path.length === word.length) out.push([...path]);
    else
      for (const n of neighbors(size, walls, cell))
        if (!used[n] && letters[n] === word[path.length]) go(n);
    path.pop();
    used[cell] = 0;
  };
  letters.forEach((l, i) => l === word[0] && go(i));
  return out;
}

/**
 * Soluciones (hasta `limit`): un recorrido por palabra, sin compartir
 * casillas. Como las longitudes suman todas las casillas, cubren el tablero.
 */
export function solve(
  size: number,
  letters: readonly string[],
  walls: ReadonlySet<number>,
  words: readonly (readonly string[])[],
  limit = 2,
): number[][][] {
  const cands = words.map((w) => pathsFor(size, letters, walls, w));
  // Primero las palabras con menos caminos posibles.
  const order = words.map((_, k) => k).sort((a, b) => cands[a].length - cands[b].length);
  const used = new Uint8Array(size * size);
  const pick: number[][] = new Array(words.length);
  const out: number[][][] = [];
  const go = (d: number) => {
    if (out.length >= limit) return;
    if (d === order.length) {
      out.push(pick.map((p) => [...p]));
      return;
    }
    const k = order[d];
    for (const p of cands[k]) {
      if (p.some((c) => used[c])) continue;
      p.forEach((c) => (used[c] = 1));
      pick[k] = p;
      go(d + 1);
      p.forEach((c) => (used[c] = 0));
      if (out.length >= limit) return;
    }
  };
  go(0);
  return out;
}

const samePath = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((c, k) => c === b[k]);

/**
 * Resultado de soltar un trazo: la palabra que completa (índice), «otro
 * camino» si deletrea una palabra pendiente pero no va por donde debe, o nada.
 */
export function checkTrace(
  g: GeneratedWordMaze,
  found: readonly number[],
  trace: readonly number[],
): { kind: 'found'; word: number } | { kind: 'otherPath' } | { kind: 'none' } {
  const { letters, words } = g.puzzle;
  const spelled = trace.map((c) => letters[c]).join('');
  let other = false;
  for (let k = 0; k < words.length; k++) {
    if (found.includes(k) || words[k].join('') !== spelled) continue;
    if (samePath(g.solution[k], trace)) return { kind: 'found', word: k };
    other = true;
  }
  return other ? { kind: 'otherPath' } : { kind: 'none' };
}

/** Pista: la siguiente palabra pendiente y cuántas letras de ella mostrar. */
export function nextHint(
  g: GeneratedWordMaze,
  found: readonly number[],
  revealed: Readonly<Record<number, number>>,
): { word: number; letters: number } | null {
  const pending = g.puzzle.words.map((_, k) => k).filter((k) => !found.includes(k));
  if (!pending.length) return null;
  // Se sigue con la palabra ya empezada; si no, la más corta pendiente.
  const started = pending.find((k) => (revealed[k] ?? 0) > 0);
  const word =
    started ??
    pending.reduce((a, b) =>
      g.puzzle.words[b].length < g.puzzle.words[a].length ? b : a,
    );
  const len = g.puzzle.words[word].length;
  return { word, letters: Math.min(len, (revealed[word] ?? 0) + 1) };
}
