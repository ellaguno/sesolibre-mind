import { describe, it, expect } from 'vitest';
import {
  CROWN,
  EMPTY,
  MARK,
  conflicts,
  hint,
  isSolved,
  orthoNeighbors,
  solutionCells,
  solve,
  type CellState,
  type CrownsPuzzle,
} from '../src/puzzles/crowns/logic';
import { generateCrowns } from '../src/puzzles/crowns/generator';

function stateFrom(size: number, crowns: number[]): CellState[] {
  const s = new Array<CellState>(size * size).fill(EMPTY);
  for (const i of crowns) s[i] = CROWN;
  return s;
}

/** ¿Cada zona es una sola pieza conexa? */
function regionsConnected(p: CrownsPuzzle): boolean {
  for (let reg = 0; reg < p.size; reg++) {
    const cells = p.regions.flatMap((r, i) => (r === reg ? [i] : []));
    if (cells.length === 0) return false;
    const seen = new Set([cells[0]]);
    const stack = [cells[0]];
    while (stack.length) {
      for (const n of orthoNeighbors(p.size, stack.pop()!)) {
        if (p.regions[n] === reg && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    if (seen.size !== cells.length) return false;
  }
  return true;
}

describe('coronas · reglas', () => {
  // 5×5, zonas = columnas: muchas soluciones, útil para probar reglas.
  const cols: CrownsPuzzle = {
    size: 5,
    regions: Array.from({ length: 25 }, (_, i) => i % 5),
  };

  it('detecta coronas en la misma fila, columna, zona o tocándose', () => {
    expect([...conflicts(cols, stateFrom(5, [0, 2]))].sort()).toEqual([0, 2]); // fila
    expect(conflicts(cols, stateFrom(5, [0, 10])).size).toBe(2); // columna/zona
    expect(conflicts(cols, stateFrom(5, [0, 6])).size).toBe(2); // diagonal
    expect(conflicts(cols, stateFrom(5, [0, 7])).size).toBe(0);
  });

  it('los ✕ no cuentan como coronas', () => {
    const s = stateFrom(5, [0]);
    s[1] = MARK;
    expect(conflicts(cols, s).size).toBe(0);
  });

  it('isSolved exige N coronas sin conflictos', () => {
    const sol = solve(cols, 1)[0];
    expect(isSolved(cols, stateFrom(5, solutionCells(5, sol)))).toBe(true);
    expect(isSolved(cols, stateFrom(5, solutionCells(5, sol).slice(1)))).toBe(false);
  });

  it('el solver respeta el límite', () => {
    expect(solve(cols, 3)).toHaveLength(3);
  });
});

describe('coronas · generador', () => {
  for (const size of [5, 6, 7, 8, 9, 10]) {
    it(`genera ${size}×${size} con solución única y zonas conexas`, () => {
      for (let seed = 1; seed <= 15; seed++) {
        const { puzzle, solution } = generateCrowns(seed * 7919 + size, size);
        expect(puzzle.regions).toHaveLength(size * size);
        expect(new Set(puzzle.regions).size).toBe(size);
        expect(regionsConnected(puzzle)).toBe(true);
        const sols = solve(puzzle, 2);
        expect(sols).toHaveLength(1);
        expect(sols[0]).toEqual(solution);
        expect(isSolved(puzzle, stateFrom(size, solutionCells(size, solution)))).toBe(
          true,
        );
      }
    });
  }

  it('es determinista: misma semilla, mismo tablero', () => {
    expect(generateCrowns(123, 8)).toEqual(generateCrowns(123, 8));
    expect(generateCrowns(123, 8)).not.toEqual(generateCrowns(124, 8));
  });
});

describe('coronas · pista', () => {
  const { puzzle, solution } = generateCrowns(42, 6);
  const target = solutionCells(6, solution);

  it('señala primero una corona mal puesta', () => {
    const wrongCell = [...Array(36).keys()].find((i) => !target.includes(i))!;
    expect(hint(puzzle, solution, stateFrom(6, [wrongCell]))).toEqual({
      kind: 'wrong',
      cell: wrongCell,
    });
  });

  it('si no hay errores, indica la siguiente corona que falta', () => {
    expect(hint(puzzle, solution, stateFrom(6, target.slice(0, 2)))).toEqual({
      kind: 'place',
      cell: target[2],
    });
    expect(hint(puzzle, solution, stateFrom(6, target))).toBeNull();
  });
});

describe('coronas · sin fugas de la solución', () => {
  it('las zonas se numeran por orden de aparición', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { puzzle } = generateCrowns(seed, 7);
      const order = [...new Set(puzzle.regions)];
      expect(order).toEqual([...Array(7).keys()]);
    }
  });

  it('la zona de cada corona no coincide siempre con su fila', () => {
    let matches = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { puzzle, solution } = generateCrowns(seed, 7);
      if (solution.every((c, r) => puzzle.regions[r * 7 + c] === r)) matches++;
    }
    expect(matches).toBeLessThan(5);
  });
});
