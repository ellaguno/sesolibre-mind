import { describe, it, expect } from 'vitest';
import { dailySeed, mulberry32, randInt, shuffle } from '../src/core/rng';

describe('rng', () => {
  it('la misma semilla produce la misma secuencia', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const sa = Array.from({ length: 10 }, a);
    expect(Array.from({ length: 10 }, b)).toEqual(sa);
    expect(sa.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('semillas distintas producen secuencias distintas', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('randInt respeta los límites', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const n = randInt(rng, 3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
    }
  });

  it('shuffle es una permutación y no muta la entrada', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(mulberry32(3), input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
  });

  it('la semilla diaria es estable y depende de fecha y actividad', () => {
    expect(dailySeed('2026-11-04', 'crowns')).toBe(dailySeed('2026-11-04', 'crowns'));
    expect(dailySeed('2026-11-04', 'crowns')).not.toBe(dailySeed('2026-11-05', 'crowns'));
    expect(dailySeed('2026-11-04', 'crowns')).not.toBe(
      dailySeed('2026-11-04', 'sunmoon'),
    );
  });
});
