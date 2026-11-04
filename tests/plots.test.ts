import { describe, it, expect } from 'vitest';
import {
  countSolutions,
  drawRect,
  eraseAt,
  fitsClue,
  hint,
  isSolved,
  plotsOf,
  rectBetween,
  rectCells,
  solveByLogic,
  type PlotsPuzzle,
  type Rect,
} from '../src/puzzles/plots/logic';
import { VARIANTS, dailyVariant, generatePlots } from '../src/puzzles/plots/generator';

function boardFrom(size: number, rects: Rect[]): number[] {
  let b = new Array<number>(size * size).fill(0);
  for (const q of rects) b = drawRect(size, b, q);
  return b;
}

describe('parcelas · reglas', () => {
  // 2×2 con dos pistas de área 2 en la columna izquierda: dos filas anchas o dos columnas altas.
  const p: PlotsPuzzle = {
    size: 2,
    clues: [
      { cell: 0, area: 2, shape: 'any' },
      { cell: 2, area: 2, shape: 'any' },
    ],
  };

  it('valida área, forma y una sola pista por parcela', () => {
    expect(
      fitsClue({ r: 0, c: 0, h: 1, w: 2 }, { cell: 0, area: 2, shape: 'wide' }),
    ).toBe(true);
    expect(
      fitsClue({ r: 0, c: 0, h: 2, w: 1 }, { cell: 0, area: 2, shape: 'wide' }),
    ).toBe(false);
    const both = boardFrom(2, [{ r: 0, c: 0, h: 2, w: 1 }]);
    expect(plotsOf(p, both)[0].clue).toBe(-1); // contiene dos pistas
  });

  it('trazar encima borra enteras las parcelas pisadas', () => {
    let b = boardFrom(2, [
      { r: 0, c: 0, h: 1, w: 2 },
      { r: 1, c: 0, h: 1, w: 2 },
    ]);
    expect(isSolved(p, b)).toBe(true);
    b = drawRect(2, b, { r: 0, c: 1, h: 1, w: 1 });
    expect(b).toEqual([0, 3, 2, 2]);
    expect(eraseAt(b, 2)).toEqual([0, 3, 0, 0]);
  });

  it('rectBetween normaliza el arrastre en cualquier dirección', () => {
    expect(rectBetween(6, 15, 2)).toEqual({ r: 0, c: 2, h: 3, w: 2 });
  });

  it('cuenta soluciones y detecta ambigüedad', () => {
    expect(countSolutions(p, 3)).toBe(1); // las columnas altas tendrían 2 pistas
    expect(solveByLogic(p)).not.toBeNull();
  });
});

describe('parcelas · generador', () => {
  for (const v of VARIANTS) {
    it(`${v.id}: solución única, coherente y resoluble por lógica`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const { puzzle, solution } = generatePlots(seed * 613 + v.size, v);
        expect(puzzle.clues.reduce((s, k) => s + k.area, 0)).toBe(v.size * v.size);
        expect(countSolutions(puzzle, 2)).toBe(1);
        expect(solveByLogic(puzzle)).toEqual(solution);
        solution.forEach((q, k) => {
          expect(fitsClue(q, puzzle.clues[k])).toBe(true);
          expect(rectCells(v.size, q)).toContain(puzzle.clues[k].cell);
        });
        expect(isSolved(puzzle, boardFrom(v.size, solution))).toBe(true);
        if (!v.shapes) expect(puzzle.clues.every((k) => k.shape === 'any')).toBe(true);
      }
    });
  }

  it('es determinista', () => {
    expect(generatePlots(3, VARIANTS[1])).toEqual(generatePlots(3, VARIANTS[1]));
    expect(generatePlots(3, VARIANTS[1])).not.toEqual(generatePlots(4, VARIANTS[1]));
  });

  it('el reto diario usa una variante conocida', () => {
    for (let d = 0; d < 7; d++)
      expect(VARIANTS).toContain(dailyVariant(new Date(2026, 10, 1 + d)));
  });
});

describe('parcelas · pista', () => {
  const { puzzle, solution } = generatePlots(21, VARIANTS[0]);

  it('quita primero una parcela equivocada', () => {
    const wrong = solution.find((q) => q.h * q.w >= 2)!;
    const b = boardFrom(6, [{ ...wrong, h: 1, w: 1 }]);
    const h = hint(puzzle, solution, b);
    expect(h?.kind).toBe('wrong');
  });

  it('aplicando pistas se resuelve el tablero', () => {
    let b = new Array<number>(36).fill(0);
    for (let k = 0; k < 40; k++) {
      const h = hint(puzzle, solution, b);
      if (!h) break;
      b =
        h.kind === 'wrong' ? b.map((v) => (v === h.id ? 0 : v)) : drawRect(6, b, h.rect);
    }
    expect(isSolved(puzzle, b)).toBe(true);
  });
});
