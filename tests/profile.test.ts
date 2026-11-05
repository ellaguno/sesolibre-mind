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

describe('tendencia semanal', () => {
  it('compara el promedio de los últimos 7 días con los 7 anteriores', async () => {
    const { weeklyDelta } = await import('../src/core/profile');
    const now = Date.UTC(2026, 10, 15);
    const d = (days: number) => now - days * 86_400_000;
    expect(
      weeklyDelta(
        [
          { at: d(1), v: 80 },
          { at: d(3), v: 70 },
          { at: d(9), v: 60 },
        ],
        now,
      ),
    ).toBe(15);
    expect(weeklyDelta([{ at: d(1), v: 80 }], now)).toBeNull();
    expect(
      weeklyDelta(
        [
          { at: d(20), v: 50 },
          { at: d(2), v: 50 },
        ],
        now,
      ),
    ).toBeNull();
  });

  it('cuenta días activos de esta semana y la anterior', async () => {
    const { weeklyActiveDays } = await import('../src/core/profile');
    const today = new Date(2026, 10, 15);
    const days = ['2026-11-15', '2026-11-14', '2026-11-09', '2026-11-08', '2026-11-01'];
    expect(weeklyActiveDays(days, today)).toEqual({ thisWeek: 3, lastWeek: 1 });
  });
});
