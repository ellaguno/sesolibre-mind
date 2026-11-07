/**
 * Crucigrama de palabras cruzadas libres: cada palabra tiene su número y su
 * pista; se escriben letra a letra con el teclado de la app.
 */

export interface Entry {
  num: number;
  /** 'a' horizontal, 'd' vertical. */
  dir: 'a' | 'd';
  cells: number[];
  clue: string;
}

export interface CrosswordPuzzle {
  rows: number;
  cols: number;
  /** Letra correcta de cada casilla; '' = casilla negra (sin letra). */
  solution: string[];
  /** Horizontales primero y luego verticales, por número. */
  entries: Entry[];
  theme: string;
}

export const isSolved = (p: CrosswordPuzzle, cells: readonly string[]) =>
  p.solution.every((l, i) => l === '' || cells[i] === l);

/** Casillas con letra escrita que no es la correcta. */
export const wrongCells = (p: CrosswordPuzzle, cells: readonly string[]) =>
  p.solution.flatMap((l, i) => (l !== '' && cells[i] && cells[i] !== l ? [i] : []));

/** Número que va en cada casilla donde empieza una palabra. */
export function numbers(p: CrosswordPuzzle): Map<number, number> {
  return new Map(p.entries.map((e) => [e.cells[0], e.num]));
}

/** Entrada que contiene la casilla en la dirección pedida (o en la otra). */
export function entryAt(p: CrosswordPuzzle, cell: number, dir: 'a' | 'd'): number {
  const same = p.entries.findIndex((e) => e.dir === dir && e.cells.includes(cell));
  return same >= 0 ? same : p.entries.findIndex((e) => e.cells.includes(cell));
}

/** Pista: la primera casilla vacía o equivocada de la entrada (o de cualquiera). */
export function hintCell(
  p: CrosswordPuzzle,
  cells: readonly string[],
  entry: number,
): number | null {
  const bad = (i: number) => cells[i] !== p.solution[i];
  const own = p.entries[entry]?.cells.find(bad);
  if (own !== undefined) return own;
  const i = p.solution.findIndex((l, k) => l !== '' && bad(k));
  return i >= 0 ? i : null;
}
