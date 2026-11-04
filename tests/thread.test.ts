import { describe, it, expect } from 'vitest';
import {
  canStep,
  clueOrder,
  edgeKey,
  hint,
  isSolved,
  neighbors,
  solve,
  wallSet,
  type ThreadPuzzle,
} from '../src/puzzles/thread/logic';
import { VARIANTS, generateThread } from '../src/puzzles/thread/generator';

describe('hilo · reglas', () => {
  // 3×3: 1 en la esquina, 2 en el centro… con zigzag como única ruta forzada por paredes.
  const p: ThreadPuzzle = { size: 3, clues: [0, 8], walls: [] };

  it('las paredes cortan la vecindad', () => {
    const w = new Set([edgeKey(0, 1)]);
    expect(neighbors(3, w, 0)).toEqual([3]);
  });

  it('valida un camino completo y rechaza saltos', () => {
    expect(isSolved(p, [0, 1, 2, 5, 4, 3, 6, 7, 8])).toBe(true);
    expect(isSolved(p, [0, 1, 2, 5, 4, 3, 6, 8, 7])).toBe(false);
  });

  it('no deja pisar un número fuera de orden ni el final antes de tiempo', () => {
    const q: ThreadPuzzle = { size: 3, clues: [0, 4, 8], walls: [] };
    const w = wallSet(q);
    const o = clueOrder(q);
    expect(canStep(q, w, o, [0], 1)).toBe(true);
    expect(canStep(q, w, o, [0, 1, 2, 5], 8)).toBe(false); // final antes de cubrir todo
    expect(canStep(q, w, o, [0, 1], 4)).toBe(true);
  });

  it('el solver encuentra todas las soluciones de un caso pequeño', () => {
    expect(solve(p, 10).every((s) => isSolved(p, s))).toBe(true);
    expect(solve(p, 10).length).toBeGreaterThan(1);
  });
});

describe('hilo · generador', () => {
  for (const v of VARIANTS) {
    it(`${v.id}: solución única y coherente`, () => {
      for (let seed = 1; seed <= (v.size === 8 ? 4 : 10); seed++) {
        const { puzzle, solution } = generateThread(seed * 389 + v.size, v);
        expect(solution).toHaveLength(v.size * v.size);
        expect(isSolved(puzzle, solution)).toBe(true);
        expect(puzzle.clues[0]).toBe(solution[0]);
        expect(puzzle.clues[puzzle.clues.length - 1]).toBe(solution[solution.length - 1]);
        const sols = solve(puzzle, 2);
        expect(sols).toEqual([solution]);
        // Ninguna pared corta el camino de la solución.
        const w = wallSet(puzzle);
        solution
          .slice(1)
          .forEach((c, k) => expect(w.has(edgeKey(solution[k], c))).toBe(false));
      }
    }, 60_000);
  }

  it('es determinista', () => {
    expect(generateThread(5, VARIANTS[0])).toEqual(generateThread(5, VARIANTS[0]));
    expect(generateThread(5, VARIANTS[0])).not.toEqual(generateThread(6, VARIANTS[0]));
  });
});

describe('hilo · pista', () => {
  const { solution } = generateThread(11, VARIANTS[0]);

  it('recorta un trazo desviado hasta donde iba bien', () => {
    const wrong = [...solution.slice(0, 4), -1];
    expect(hint(solution, wrong)).toEqual({ kind: 'back', keep: 4 });
  });

  it('alarga un trazo correcto', () => {
    expect(hint(solution, solution.slice(0, 2))).toEqual({
      kind: 'extend',
      cells: solution.slice(2, 5),
    });
    expect(hint(solution, solution)).toBeNull();
  });
});
