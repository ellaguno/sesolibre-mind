import { describe, it, expect } from 'vitest';
import { VARIANTS, generateCrossword } from '../src/puzzles/crossword/generator';
import { hintCell, isSolved, numbers, wrongCells } from '../src/puzzles/crossword/logic';
import { THEMES_ES } from '../src/words/data/es';
import { THEMES_EN } from '../src/words/data/en';

/** Todas las rachas de 2+ letras seguidas del tablero (horizontales y verticales). */
function runs(rows: number, cols: number, sol: string[]): number[][] {
  const out: number[][] = [];
  const scan = (cells: number[]) => {
    let cur: number[] = [];
    for (const c of [...cells, -1]) {
      if (c >= 0 && sol[c]) cur.push(c);
      else {
        if (cur.length > 1) out.push(cur);
        cur = [];
      }
    }
  };
  for (let r = 0; r < rows; r++) scan([...Array(cols).keys()].map((c) => r * cols + c));
  for (let c = 0; c < cols; c++) scan([...Array(rows).keys()].map((r) => r * cols + c));
  return out;
}

describe('crossword generator', () => {
  for (const [lang, themes] of [
    ['es', THEMES_ES],
    ['en', THEMES_EN],
  ] as const)
    for (const v of VARIANTS)
      it(`${lang} ${v.id}: palabras cruzadas sin rellenos accidentales`, () => {
        for (const seed of [1, 2, 3, 4]) {
          const p = generateCrossword(seed, v, themes);
          expect(p.rows).toBeLessThanOrEqual(v.box);
          expect(p.cols).toBeLessThanOrEqual(v.box);
          expect(p.entries.length).toBeGreaterThanOrEqual(v.words - 1);
          // Cada racha de letras del tablero es exactamente una entrada.
          const entryKeys = new Set(p.entries.map((e) => e.cells.join()));
          for (const run of runs(p.rows, p.cols, p.solution))
            expect(entryKeys.has(run.join())).toBe(true);
          expect(p.entries.every((e) => e.clue.length > 0)).toBe(true);
          expect(numbers(p).size).toBeGreaterThan(0);
        }
      });

  it('isSolved, wrongCells y hintCell', () => {
    const p = generateCrossword(5, VARIANTS[1], THEMES_ES);
    const empty = p.solution.map(() => '');
    expect(isSolved(p, empty)).toBe(false);
    expect(isSolved(p, p.solution)).toBe(true);
    const e0 = p.entries[0];
    expect(hintCell(p, empty, 0)).toBe(e0.cells[0]);
    const bad = [...p.solution];
    bad[e0.cells[1]] = bad[e0.cells[1]] === 'A' ? 'B' : 'A';
    expect(wrongCells(p, bad)).toEqual([e0.cells[1]]);
  });

  it('es determinista por semilla', () => {
    expect(generateCrossword(9, VARIANTS[0], THEMES_EN)).toEqual(
      generateCrossword(9, VARIANTS[0], THEMES_EN),
    );
  });
});
