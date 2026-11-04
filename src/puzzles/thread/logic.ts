/**
 * Hilo (género genérico: camino hamiltoniano con números ordenados y paredes,
 * de la familia Numbrix / Hidato).
 *
 * Hay que trazar un único camino, de casilla en casilla vecina (sin diagonales),
 * que pase por todas las casillas exactamente una vez, empiece en el 1, visite
 * los números en orden y termine en el último. Las paredes no se cruzan.
 *
 * Celdas en array plano: i = fila * N + columna.
 */

export interface ThreadPuzzle {
  size: number;
  /** Celdas numeradas en orden: clues[0] es el 1, clues[k] es el k+1. */
  clues: number[];
  /** Paredes: pares [a, b] de celdas vecinas con a < b. */
  walls: [number, number][];
}

export const edgeKey = (a: number, b: number) => (a < b ? a * 4096 + b : b * 4096 + a);

/** Vecinas ortogonales sin pared de por medio. */
export function neighbors(size: number, walls: ReadonlySet<number>, i: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out.filter((n) => !walls.has(edgeKey(i, n)));
}

export function wallSet(p: ThreadPuzzle): Set<number> {
  return new Set(p.walls.map(([a, b]) => edgeKey(a, b)));
}

/** Orden de cada celda numerada (o -1). */
export function clueOrder(p: ThreadPuzzle): number[] {
  const order = new Array<number>(p.size * p.size).fill(-1);
  p.clues.forEach((cell, k) => (order[cell] = k));
  return order;
}

/**
 * ¿Se puede pasar de `path` (prefijo válido) a la celda `next`? Debe ser
 * vecina sin pared, no visitada, y si tiene número debe ser el siguiente.
 */
export function canStep(
  p: ThreadPuzzle,
  walls: ReadonlySet<number>,
  order: readonly number[],
  path: readonly number[],
  next: number,
): boolean {
  const head = path[path.length - 1];
  if (!neighbors(p.size, walls, head).includes(next) || path.includes(next)) return false;
  const k = order[next];
  if (k < 0) return true;
  const reached = path.reduce((m, c) => Math.max(m, order[c]), -1);
  if (k !== reached + 1) return false;
  // El último número sólo puede pisarse al cubrir todo el tablero.
  return k < p.clues.length - 1 || path.length + 1 === p.size * p.size;
}

export function isSolved(p: ThreadPuzzle, path: readonly number[]): boolean {
  if (path.length !== p.size * p.size || path[0] !== p.clues[0]) return false;
  if (new Set(path).size !== path.length) return false;
  const walls = wallSet(p);
  const order = clueOrder(p);
  let next = 0;
  for (let k = 0; k < path.length; k++) {
    if (k > 0 && !neighbors(p.size, walls, path[k - 1]).includes(path[k])) return false;
    const o = order[path[k]];
    if (o >= 0) {
      if (o !== next) return false;
      next++;
    }
  }
  return next === p.clues.length && path[path.length - 1] === p.clues[p.clues.length - 1];
}

/**
 * Busca soluciones (hasta `limit`) por DFS con poda:
 *  - los números deben aparecer en orden y el último cerrar el camino;
 *  - las casillas sin visitar deben seguir conectadas y alcanzables;
 *  - ninguna casilla sin visitar (salvo el final) puede quedar con menos de
 *    dos salidas posibles.
 */
export function solve(p: ThreadPuzzle, limit = 2): number[][] {
  return search(p, limit, Infinity).found;
}

/**
 * Como `solve`, pero se detiene tras `maxNodes` nodos explorados. `complete`
 * es false si se agotó el presupuesto (entonces `found` puede estar incompleto).
 */
export function search(
  p: ThreadPuzzle,
  limit: number,
  maxNodes: number,
): { found: number[][]; complete: boolean } {
  const { size } = p;
  const n = size * size;
  const walls = wallSet(p);
  const adj = Array.from({ length: n }, (_, i) => neighbors(size, walls, i));
  const order = clueOrder(p);
  const end = p.clues[p.clues.length - 1];
  const visited = new Uint8Array(n);
  const path: number[] = [p.clues[0]];
  const found: number[][] = [];
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  visited[p.clues[0]] = 1;

  // Paridad de tablero de ajedrez: el camino alterna colores, así que de las
  // `remaining` casillas que faltan, ceil(remaining/2) deben ser del color
  // contrario a la cabeza. Cuenta de casillas libres por color:
  const color = (i: number) => (Math.floor(i / size) + (i % size)) & 1;
  const free = [0, 0];
  for (let i = 0; i < n; i++) free[color(i)]++;
  free[color(p.clues[0])]--;

  const feasible = (head: number, remaining: number): boolean => {
    if (free[1 - color(head)] !== Math.ceil(remaining / 2)) return false;
    // Grados de las casillas libres.
    for (let u = 0; u < n; u++) {
      if (visited[u]) continue;
      let deg = 0;
      for (const v of adj[u]) if (!visited[v] || v === head) deg++;
      if (deg < (u === end ? 1 : 2)) return false;
    }
    // Conectividad desde la cabeza.
    seen.fill(0);
    let top = 0;
    let count = 0;
    for (const v of adj[head]) {
      if (!visited[v] && !seen[v]) {
        seen[v] = 1;
        stack[top++] = v;
      }
    }
    while (top) {
      const u = stack[--top];
      count++;
      for (const v of adj[u]) {
        if (!visited[v] && !seen[v]) {
          seen[v] = 1;
          stack[top++] = v;
        }
      }
    }
    return count === remaining;
  };

  let nodes = 0;
  let aborted = false;
  const rec = (head: number, nextClue: number) => {
    if (found.length >= limit || aborted) return;
    if (++nodes > maxNodes) {
      aborted = true;
      return;
    }
    if (path.length === n) {
      if (head === end) found.push([...path]);
      return;
    }
    if (!feasible(head, n - path.length)) return;
    // Movimiento forzado: una vecina libre cuya única otra salida es la cabeza
    // (o el final, si sólo la toca la cabeza) se queda aislada si no vamos ya.
    let forced = -1;
    for (const v of adj[head]) {
      if (visited[v]) continue;
      let deg = 0;
      for (const w of adj[v]) if (!visited[w] || w === head) deg++;
      if (deg === (v === end ? 1 : 2) && !(v === end && path.length + 1 !== n)) {
        if (forced >= 0) return; // dos casillas exigen ser la siguiente
        forced = v;
      }
    }
    for (const v of forced >= 0 ? [forced] : adj[head]) {
      if (visited[v]) continue;
      const o = order[v];
      if (o >= 0 && o !== nextClue) continue;
      if (v === end && path.length + 1 !== n) continue;
      visited[v] = 1;
      free[color(v)]--;
      path.push(v);
      rec(v, o >= 0 ? nextClue + 1 : nextClue);
      path.pop();
      free[color(v)]++;
      visited[v] = 0;
      if (found.length >= limit || aborted) return;
    }
  };

  rec(p.clues[0], 1);
  return { found, complete: !aborted };
}

export type Hint =
  | { kind: 'back'; keep: number } // el camino se desvió: conservar los primeros `keep`
  | { kind: 'extend'; cells: number[] }; // siguientes casillas del camino

/**
 * Pista: si el trazo se aparta de la solución, recortarlo hasta donde iba bien;
 * si no, alargarlo unas casillas.
 */
export function hint(
  solution: readonly number[],
  path: readonly number[],
  step = 3,
): Hint | null {
  let k = 0;
  while (k < path.length && path[k] === solution[k]) k++;
  if (k < path.length) return { kind: 'back', keep: Math.max(1, k) };
  if (k >= solution.length) return null;
  return { kind: 'extend', cells: solution.slice(k, k + step) };
}
