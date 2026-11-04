import { mulberry32, pick, shuffle, type Rng } from '../../core/rng';
import { orthoNeighbors, solve, type CrownsPuzzle } from './logic';

/**
 * Generador de Coronas con solución única.
 *
 * 1. Coloca N coronas válidas al azar (una por fila y columna, sin tocarse).
 * 2. Cada corona es la semilla de una zona; las zonas crecen al azar hasta
 *    cubrir el tablero (así la solución elegida siempre es válida).
 * 3. Reparación: mientras exista otra solución, toma una de sus coronas que no
 *    esté en la nuestra y pasa esa celda a una zona vecina (sin desconectar la
 *    zona de origen). Eso invalida la solución alternativa. Si tras varios
 *    intentos sigue sin ser única, vuelve a empezar.
 */

export const MIN_SIZE = 4;
export const MAX_SIZE = 10;

export interface GeneratedCrowns {
  puzzle: CrownsPuzzle;
  /** Columna de la corona en cada fila. */
  solution: number[];
}

/** Permutación aleatoria sin filas contiguas con columnas contiguas. */
function randomPlacement(rng: Rng, size: number): number[] | null {
  const cols: number[] = [];
  const used = new Array<boolean>(size).fill(false);
  const place = (r: number): boolean => {
    if (r === size) return true;
    for (const c of shuffle(rng, [...Array(size).keys()])) {
      if (used[c] || (r > 0 && Math.abs(c - cols[r - 1]) <= 1)) continue;
      used[c] = true;
      cols.push(c);
      if (place(r + 1)) return true;
      cols.pop();
      used[c] = false;
    }
    return false;
  };
  return place(0) ? cols : null;
}

/** Tamaño del reto diario según el día de la semana: lunes fácil → fin de semana difícil. */
export function dailySize(date: Date): number {
  // domingo, lunes, martes, miércoles, jueves, viernes, sábado
  return [9, 6, 6, 7, 7, 8, 8][date.getDay()];
}

/** Hace crecer las zonas desde sus semillas hasta llenar el tablero. */
function growRegions(rng: Rng, size: number, seeds: number[]): number[] {
  const regions = new Array<number>(size * size).fill(-1);
  seeds.forEach((cell, reg) => (regions[cell] = reg));
  let free = size * size - seeds.length;
  while (free > 0) {
    // Celdas libres que tocan alguna zona, con las zonas candidatas.
    const frontier: [number, number][] = [];
    for (let i = 0; i < regions.length; i++) {
      if (regions[i] !== -1) continue;
      for (const n of orthoNeighbors(size, i)) {
        if (regions[n] !== -1) frontier.push([i, regions[n]]);
      }
    }
    const [cell, reg] = pick(rng, frontier);
    regions[cell] = reg;
    free--;
  }
  return regions;
}

/** ¿La zona `reg` sigue conexa si se le quita la celda `removed`? */
function connectedWithout(
  size: number,
  regions: readonly number[],
  reg: number,
  removed: number,
): boolean {
  const cells = regions.flatMap((r, i) => (r === reg && i !== removed ? [i] : []));
  if (cells.length === 0) return false;
  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const i = stack.pop()!;
    for (const n of orthoNeighbors(size, i)) {
      if (n !== removed && regions[n] === reg && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === cells.length;
}

const MAX_REPAIRS = 60;

function attempt(rng: Rng, size: number): GeneratedCrowns | null {
  const solution = randomPlacement(rng, size);
  if (!solution) return null;
  const seeds = solution.map((c, r) => r * size + c);
  const isSeed = new Set(seeds);
  const regions = growRegions(rng, size, seeds);
  const puzzle: CrownsPuzzle = { size, regions };

  for (let k = 0; k < MAX_REPAIRS; k++) {
    const sols = solve(puzzle, 2);
    if (sols.length === 1) return { puzzle, solution: sols[0] };
    const alt = sols.find((s) => s.some((c, r) => c !== solution[r]));
    if (!alt) return null;
    // Celdas de la solución alternativa que se pueden mover de zona.
    const movable = shuffle(
      rng,
      alt.flatMap((c, r) => {
        const i = r * size + c;
        return isSeed.has(i) ? [] : [i];
      }),
    );
    let moved = false;
    for (const cell of movable) {
      const from = regions[cell];
      if (!connectedWithout(size, regions, from, cell)) continue;
      const targets = [
        ...new Set(orthoNeighbors(size, cell).map((n) => regions[n])),
      ].filter((r) => r !== from);
      if (targets.length === 0) continue;
      regions[cell] = pick(rng, targets);
      moved = true;
      break;
    }
    if (!moved) return null;
  }
  return null;
}

/**
 * Renumera las zonas por orden de aparición (lectura de izquierda a derecha y
 * de arriba abajo). Sin esto, la zona k contendría siempre la corona de la
 * fila k y su color delataría la solución.
 */
function relabel(regions: readonly number[]): number[] {
  const map = new Map<number, number>();
  return regions.map((r) => {
    if (!map.has(r)) map.set(r, map.size);
    return map.get(r)!;
  });
}

/** Genera un tablero de Coronas de lado `size` con solución única. */
export function generateCrowns(seed: number, size: number): GeneratedCrowns {
  if (size < MIN_SIZE || size > MAX_SIZE) throw new RangeError(`size ${size}`);
  const rng = mulberry32(seed);
  for (;;) {
    const result = attempt(rng, size);
    if (result) {
      return { ...result, puzzle: { size, regions: relabel(result.puzzle.regions) } };
    }
  }
}
