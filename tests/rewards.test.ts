import { describe, it, expect } from 'vitest';
import {
  applyActiveDay,
  currentStreak,
  isConsecutive,
  type RewardData,
} from '../src/core/RewardService';

const empty: RewardData = {
  lastActiveDay: null,
  streak: 0,
  bestStreak: 0,
  activeDays: [],
  achievements: [],
};

describe('racha de constancia', () => {
  it('detecta días consecutivos, incluso en cambio de mes y de horario', () => {
    expect(isConsecutive('2026-10-31', '2026-11-01')).toBe(true);
    expect(isConsecutive('2026-03-28', '2026-03-29')).toBe(true);
    expect(isConsecutive('2026-11-01', '2026-11-03')).toBe(false);
  });

  it('suma días seguidos y es idempotente dentro del mismo día', () => {
    let d = applyActiveDay(empty, '2026-11-01');
    d = applyActiveDay(d, '2026-11-01');
    d = applyActiveDay(d, '2026-11-02');
    d = applyActiveDay(d, '2026-11-03');
    expect(d.streak).toBe(3);
    expect(d.activeDays).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(d.achievements).toContain('streak_3');
  });

  it('un hueco reinicia la racha pero conserva la mejor', () => {
    let d = applyActiveDay(empty, '2026-11-01');
    d = applyActiveDay(d, '2026-11-02');
    d = applyActiveDay(d, '2026-11-05');
    expect(d.streak).toBe(1);
    expect(d.bestStreak).toBe(2);
  });

  it('la racha vigente cae a 0 si ayer no hubo actividad', () => {
    const d = applyActiveDay(empty, '2026-11-01');
    expect(currentStreak(d, '2026-11-01')).toBe(1);
    expect(currentStreak(d, '2026-11-02')).toBe(1);
    expect(currentStreak(d, '2026-11-03')).toBe(0);
  });
});

describe('racha que perdona (modo sereno)', () => {
  it('faltar un solo día no la rompe; faltar dos, sí', () => {
    let d = applyActiveDay(empty, '2026-11-01', true);
    d = applyActiveDay(d, '2026-11-03', true);
    expect(d.streak).toBe(2);
    expect(currentStreak(d, '2026-11-05', true)).toBe(2);
    expect(currentStreak(d, '2026-11-06', true)).toBe(0);
    d = applyActiveDay(d, '2026-11-06', true);
    expect(d.streak).toBe(1);
  });

  it('sin modo sereno, un día de hueco sí la rompe', () => {
    let d = applyActiveDay(empty, '2026-11-01');
    d = applyActiveDay(d, '2026-11-03');
    expect(d.streak).toBe(1);
  });
});
