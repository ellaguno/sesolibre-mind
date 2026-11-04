import { describe, it, expect } from 'vitest';
import { findActivity } from '../src/core/registry';
import { normalize } from '../src/core/profile';

const entry = (value: number, meta?: Record<string, unknown>) => ({ value, at: 0, meta });

describe('Índice Seso', () => {
  it('tiempo: igualar el objetivo da 100 y tardar el doble da 50', () => {
    const qm = findActivity('quickmath')!;
    expect(normalize(qm, '4', entry(30))).toBe(100);
    expect(normalize(qm, '4', entry(60))).toBe(50);
    expect(normalize(qm, '4', entry(10))).toBe(100); // tope
  });

  it('puntos: proporcional al objetivo de la variante', () => {
    const ns = findActivity('numberspan')!;
    expect(normalize(ns, 'forward', entry(4))).toBe(50);
    expect(normalize(ns, 'backward', entry(7))).toBe(100);
  });

  it('las pistas restan', () => {
    const crowns = findActivity('crowns')!;
    expect(normalize(crowns, '7', entry(90, { hints: 2 }))).toBe(80);
  });

  it('todas las actividades disponibles tienen referencia', async () => {
    const { activities } = await import('../src/core/registry');
    for (const a of activities.filter((x) => x.available)) {
      for (const v of a.variants) {
        expect(normalize(a, v, entry(1)), `${a.id}:${v}`).not.toBeNull();
      }
    }
  });
});
