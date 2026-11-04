import { describe, it, expect } from 'vitest';
import { findActivity } from '../src/core/registry';
import { dailyPlan, isComplete } from '../src/core/session';

describe('sesión diaria', () => {
  it('3 ejercicios de habilidades distintas + 1 puzzle, deterministas por fecha', () => {
    for (let d = 1; d <= 30; d++) {
      const day = `2026-11-${String(d).padStart(2, '0')}`;
      const plan = dailyPlan(day);
      expect(plan).toEqual(dailyPlan(day));
      expect(plan.steps).toHaveLength(4);
      const acts = plan.steps.map((id) => findActivity(id)!);
      expect(acts.slice(0, 3).every((a) => a.kind === 'exercise')).toBe(true);
      expect(new Set(acts.slice(0, 3).map((a) => a.domain)).size).toBe(3);
      expect(acts[3].kind).toBe('puzzle');
    }
  });

  it('el puzzle rota de un día a otro', () => {
    const puzzles = new Set(
      Array.from({ length: 10 }, (_, d) => dailyPlan(`2026-11-${10 + d}`).steps[3]),
    );
    expect(puzzles.size).toBe(5);
  });

  it('está completa sólo con todos los resultados', () => {
    const plan = dailyPlan('2026-11-04');
    const results = plan.steps.map((id) => ({ id, score: 1 }));
    expect(isComplete(plan, { day: plan.day, results: results.slice(0, 3) })).toBe(false);
    expect(isComplete(plan, { day: plan.day, results })).toBe(true);
  });
});
