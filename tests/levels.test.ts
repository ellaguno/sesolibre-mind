import { describe, it, expect } from 'vitest';
import { activities, findActivity } from '../src/core/registry';
import { applyResult, levelOf, startLevel, type LevelsData } from '../src/core/levels';
import { generateCrowns } from '../src/puzzles/crowns/generator';
import { solve } from '../src/puzzles/crowns/logic';
import { generateSunMoon } from '../src/puzzles/sunmoon/generator';
import { countSolutions as countSM } from '../src/puzzles/sunmoon/logic';
import { VARIANTS as PLOTS, generatePlots } from '../src/puzzles/plots/generator';
import { countSolutions as countPlots } from '../src/puzzles/plots/logic';
import { VARIANTS as THREAD, generateThread } from '../src/puzzles/thread/generator';
import { solve as solveThread } from '../src/puzzles/thread/logic';
import { generateSudoku } from '../src/puzzles/minisudoku/generator';
import {
  countSolutions as countSudoku,
  isSolved,
  solveByLogic,
} from '../src/puzzles/minisudoku/logic';

const empty: LevelsData = { start: null, current: {}, passes: {} };

describe('escalera de niveles', () => {
  it('cada actividad tiene niveles y su nivel normal está entre ellos', () => {
    for (const a of activities) {
      expect(a.variants.length, a.id).toBeGreaterThanOrEqual(3);
      expect(a.variants).toContain(a.normal);
    }
  });

  it('la pregunta inicial fija el punto de partida', () => {
    const qm = findActivity('quickmath')!;
    expect(startLevel(qm, 'basic')).toBe('1');
    expect(startLevel(qm, 'normal')).toBe('4');
    expect(startLevel(qm, 'challenge')).toBe('5');
    expect(levelOf({ ...empty, start: 'basic' }, qm)).toBe('1');
    expect(levelOf({ ...empty, start: 'basic', current: { quickmath: '3' } }, qm)).toBe(
      '3',
    );
  });

  it('propone subir tras dos aprobados en el nivel actual, una sola vez', () => {
    const qm = findActivity('quickmath')!;
    let d: LevelsData = { ...empty, start: 'basic' };
    let r = applyResult(d, qm, '1', true);
    expect(r.suggest).toBeNull();
    r = applyResult((d = r.data), qm, '1', false);
    expect(r.suggest).toBeNull();
    r = applyResult((d = r.data), qm, '1', true);
    expect(r.suggest).toBe('2');
    r = applyResult(r.data, qm, '1', true);
    expect(r.suggest).toBeNull();
  });

  it('nunca propone subir desde el último nivel', () => {
    const qm = findActivity('quickmath')!;
    let d: LevelsData = { ...empty, start: 'challenge' };
    d = applyResult(d, qm, '5', true).data;
    expect(applyResult(d, qm, '5', true).suggest).toBeNull();
  });
});

describe('niveles básicos de los puzzles', () => {
  it('coronas 4×4 y 5×5 con solución única', () => {
    for (let s = 1; s <= 10; s++) {
      for (const n of [4, 5])
        expect(solve(generateCrowns(s, n).puzzle, 2)).toHaveLength(1);
    }
  });

  it('sol y luna 4×4 con solución única', () => {
    for (let s = 1; s <= 10; s++)
      expect(countSM(generateSunMoon(s, 4, 'easy').puzzle)).toBe(1);
  });

  it('parcelas y hilo 4×4 y 5×5 con solución única', () => {
    for (let s = 1; s <= 8; s++) {
      for (const v of PLOTS.slice(0, 2))
        expect(countPlots(generatePlots(s, v).puzzle)).toBe(1);
      for (const v of THREAD.slice(0, 2))
        expect(solveThread(generateThread(s, v).puzzle, 2)).toHaveLength(1);
    }
  });

  it('sudoku 4×4 (cajas 2×2) con solución única y resoluble por lógica', () => {
    for (let s = 1; s <= 15; s++) {
      const { givens, solution } = generateSudoku(s, 'easy', 4);
      expect(givens).toHaveLength(16);
      expect(isSolved(solution)).toBe(true);
      expect(countSudoku(givens, 2)).toBe(1);
      expect(solveByLogic(givens, ['naked'])?.grid).toEqual(solution);
    }
  });
});
