import { describe, expect, it } from 'vitest';
import {
  VARIANTS,
  blobCount,
  canMerge,
  generateFusion,
  isSolved,
  merge,
  solve,
} from '../src/puzzles/fusion/logic';

describe('Fusión', () => {
  it('fusiona solo vecinas iguales', () => {
    const b = [2, 2, 0, 4, 0, 0, 2, 0, 0];
    expect(canMerge(b, 3, 0, 1)).toBe(true);
    expect(canMerge(b, 3, 0, 3)).toBe(false); // distinto valor
    expect(canMerge(b, 3, 0, 6)).toBe(false); // no es vecina
    expect(merge(b, 0, 1)).toEqual([0, 4, 0, 4, 0, 0, 2, 0, 0]);
  });

  it('genera tableros resolubles, deterministas y con las burbujas pedidas', () => {
    for (const v of VARIANTS) {
      for (const seed of [1, 2, 3]) {
        const g = generateFusion(seed, v.id);
        expect(g).toEqual(generateFusion(seed, v.id));
        expect(g.size).toBe(v.size);
        expect(blobCount(g.board)).toBe(v.blobs);
        const path = solve(g.board, g.size);
        expect(path).not.toBeNull();
        let b = g.board;
        for (const m of path!) {
          expect(canMerge(b, g.size, m.from, m.to)).toBe(true);
          b = merge(b, m.from, m.to);
        }
        expect(isSolved(b)).toBe(true);
      }
    }
  });

  it('detecta un tablero sin salida', () => {
    expect(solve([2, 4, 0, 0, 0, 0, 0, 0, 0], 3)).toBeNull();
  });
});
