import { mulberry32, pick, shuffle, type Rng } from '../../core/rng';
import { edgeKey, search, type ThreadPuzzle } from './logic';

/**
 * Generador de Hilo.
 *
 * 1. Camino hamiltoniano aleatorio: se parte de un zigzag y se aplican muchos
 *    movimientos «backbite» (unir un extremo a una vecina e invertir el tramo),
 *    que mezclan el camino conservando que pase por todas las casillas.
 * 2. Pistas iniciales: el 1 al principio, el último al final y unos pocos
 *    números intermedios.
 * 3. Reparación: mientras haya otra solución, se añade algo que la descarte:
 *    una pared en un paso que la alternativa usa y la nuestra no, o un número
 *    donde ambas divergen.
 * 4. En difícil se intentan quitar pistas sobrantes conservando la unicidad.
 */

export const VARIANTS = [
  { id: '4', size: 4, hard: false },
  { id: '5', size: 5, hard: false },
  { id: '6', size: 6, hard: false },
  { id: '7', size: 7, hard: false },
  { id: '8', size: 8, hard: true },
] as const satisfies readonly { id: string; size: number; hard: boolean }[];
export type Variant = (typeof VARIANTS)[number];

export interface GeneratedThread {
  puzzle: ThreadPuzzle;
  solution: number[];
}

function gridNeighbors(size: number, i: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
}

function randomHamiltonianPath(rng: Rng, size: number): number[] {
  let path: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let k = 0; k < size; k++) path.push(r * size + (r % 2 ? size - 1 - k : k));
  }
  const pos = new Array<number>(size * size);
  const reindex = () => path.forEach((c, k) => (pos[c] = k));
  reindex();
  const moves = size * size * 20;
  for (let m = 0; m < moves; m++) {
    if (rng() < 0.5) (path.reverse(), reindex());
    // Extremo final: unirlo a una vecina x (no su predecesora) e invertir lo que sigue a x.
    const end = path[path.length - 1];
    const prev = path[path.length - 2];
    const x = pick(
      rng,
      gridNeighbors(size, end).filter((v) => v !== prev),
    );
    if (x === undefined) continue;
    const j = pos[x];
    path = [...path.slice(0, j + 1), ...path.slice(j + 1).reverse()];
    reindex();
  }
  return path;
}

/** Índices del camino que llevan número: siempre el primero y el último. */
function initialCluePositions(rng: Rng, length: number, extra: number): number[] {
  const inner = shuffle(
    rng,
    [...Array(length - 2).keys()].map((k) => k + 1),
  ).slice(0, extra);
  return [0, ...inner, length - 1].sort((a, b) => a - b);
}

function build(size: number, path: number[], positions: number[], walls: Set<number>) {
  const list: [number, number][] = [...walls].map((k) => [
    Math.floor(k / 4096),
    k % 4096,
  ]);
  list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return {
    size,
    clues: positions.map((k) => path[k]),
    walls: list,
  } satisfies ThreadPuzzle;
}

const MAX_REPAIRS = 200;
/** Nodos máximos por búsqueda: acota el tiempo de generación en tableros grandes. */
const NODE_BUDGET = 20_000;

function attempt(rng: Rng, variant: Variant): GeneratedThread | null {
  const { size } = variant;
  const n = size * size;
  const path = randomHamiltonianPath(rng, size);
  const pathEdges = new Set(path.slice(1).map((c, k) => edgeKey(path[k], c)));
  let positions = initialCluePositions(rng, n, Math.max(2, size - 3));
  const walls = new Set<number>();

  /** ¿Solución única demostrada dentro del presupuesto? */
  const provenUnique = (pos: number[]) => {
    const r = search(build(size, path, pos, walls), 2, NODE_BUDGET);
    return r.complete && r.found.length === 1;
  };

  let unique = false;
  for (let k = 0; k < MAX_REPAIRS; k++) {
    const r = search(build(size, path, positions, walls), 2, NODE_BUDGET);
    const alt = r.found.find((s) => s.some((c, i) => c !== path[i]));
    if (!alt && r.complete) {
      unique = r.found.length === 1;
      break;
    }
    if (!alt) {
      // Presupuesto agotado sin otra solución a la vista: un número más en el
      // tramo más largo sin números acota mucho la búsqueda.
      let best = 0;
      for (let i = 1; i < positions.length; i++) {
        if (positions[i] - positions[i - 1] > positions[best + 1] - positions[best])
          best = i - 1;
      }
      const mid = Math.floor((positions[best] + positions[best + 1]) / 2);
      positions = [...new Set([...positions, mid])].sort((a, b) => a - b);
      continue;
    }
    const div = alt.findIndex((c, i) => c !== path[i]);
    // Pasos de la alternativa que nuestro camino no usa → candidatos a pared.
    const wallCands = alt
      .slice(1)
      .map((c, i) => edgeKey(alt[i], c))
      .filter((e) => !pathEdges.has(e) && !walls.has(e));
    if (wallCands.length && rng() < 0.6) {
      walls.add(pick(rng, wallCands));
    } else {
      // Número en nuestro camino justo donde la alternativa se separa.
      positions = [...new Set([...positions, div])].sort((a, b) => a - b);
    }
  }
  if (!unique) return null;

  if (variant.hard) {
    // Quitar números intermedios y paredes que sobren.
    for (const p of shuffle(rng, positions.slice(1, -1))) {
      const fewer = positions.filter((x) => x !== p);
      if (provenUnique(fewer)) positions = fewer;
    }
    for (const w of shuffle(rng, [...walls])) {
      walls.delete(w);
      if (!provenUnique(positions)) walls.add(w);
    }
  }
  return { puzzle: build(size, path, positions, walls), solution: path };
}

export function generateThread(seed: number, variant: Variant): GeneratedThread {
  const rng = mulberry32(seed);
  for (;;) {
    const g = attempt(rng, variant);
    if (g) return g;
  }
}

/** Reto diario: 6×6 lun–jue, 7×7 el viernes, 8×8 difícil el fin de semana. */
export function dailyVariant(date: Date): Variant {
  const day = date.getDay();
  return VARIANTS[day === 0 || day === 6 ? 4 : day === 5 ? 3 : 2];
}
