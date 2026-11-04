import { describe, it, expect } from 'vitest';
import {
  N,
  UNITS,
  conflicts,
  countSolutions,
  hint,
  isSolved,
  nextDeduction,
  solveByLogic,
} from '../src/puzzles/minisudoku/logic';
import {
  VARIANTS,
  dailyVariant,
  generateSudoku,
} from '../src/puzzles/minisudoku/generator';

describe('sudoku mini · reglas', () => {
  it('hay 18 unidades de 6 celdas (filas, columnas y cajas 2×3)', () => {
    expect(UNITS).toHaveLength(18);
    expect(UNITS.every((u) => u.cells.length === N)).toBe(true);
    const box0 = UNITS.find((u) => u.kind === 'box' && u.index === 0)!;
    expect(box0.cells).toEqual([0, 1, 2, 6, 7, 8]);
  });

  it('detecta repetidos en fila, columna y caja', () => {
    const g = new Array<number>(36).fill(0);
    g[0] = 3;
    g[5] = 3; // misma fila
    expect([...conflicts(g)].sort((a, b) => a - b)).toEqual([0, 5]);
    g[5] = 0;
    g[7] = 3; // misma caja
    expect(conflicts(g).size).toBe(2);
  });
});

describe('sudoku mini · generador', () => {
  for (const v of VARIANTS) {
    it(`${v.id}: solución única, coherente y resoluble por lógica`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const { givens, solution } = generateSudoku(seed * 131, v.difficulty);
        expect(isSolved(solution)).toBe(true);
        givens.forEach((g, i) => g && expect(g).toBe(solution[i]));
        expect(countSolutions(givens, 2)).toBe(1);
        const allowed =
          v.difficulty === 'easy' ? (['naked'] as const) : (['naked', 'hidden'] as const);
        expect(solveByLogic(givens, allowed)?.grid).toEqual(solution);
      }
    });
  }

  it('difícil necesita «único lugar» y tiene menos pistas que fácil', () => {
    let easyClues = 0;
    let hardClues = 0;
    let needHidden = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const e = generateSudoku(seed, 'easy');
      const h = generateSudoku(seed, 'hard');
      easyClues += e.givens.filter(Boolean).length;
      hardClues += h.givens.filter(Boolean).length;
      if (!solveByLogic(h.givens, ['naked'])) needHidden++;
    }
    expect(hardClues).toBeLessThan(easyClues);
    expect(needHidden).toBeGreaterThanOrEqual(18);
  });

  it('es determinista', () => {
    expect(generateSudoku(9, 'hard')).toEqual(generateSudoku(9, 'hard'));
    expect(generateSudoku(9, 'hard')).not.toEqual(generateSudoku(10, 'hard'));
  });

  it('el reto diario usa una variante conocida', () => {
    for (let d = 0; d < 7; d++) {
      expect(VARIANTS).toContain(dailyVariant(new Date(2026, 10, 1 + d)));
    }
  });
});

describe('sudoku mini · pista', () => {
  const { givens, solution } = generateSudoku(4, 'hard');

  it('corrige primero una cifra equivocada', () => {
    const g = [...givens];
    const i = g.indexOf(0);
    g[i] = (solution[i] % 6) + 1;
    expect(hint(solution, g)).toEqual({ kind: 'wrong', cell: i });
  });

  it('da deducciones correctas que resuelven el tablero', () => {
    const g = [...givens];
    for (let k = 0; k < 36; k++) {
      const h = hint(solution, g);
      if (!h) break;
      expect(h.kind).toBe('place');
      if (h.kind === 'place') {
        expect(h.deduction).not.toBeNull();
        expect(h.value).toBe(solution[h.cell]);
        g[h.cell] = h.value;
      }
    }
    expect(g).toEqual(solution);
    expect(nextDeduction(g)).toBeNull();
  });
});
