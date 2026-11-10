import { describe, it, expect } from 'vitest';
import { allowedInitials, blockedInitials, validInitials } from '../src/core/online';
import BLOCKED from '../server/score/blocked-initials.json';

describe('iniciales para comparar en línea', () => {
  it('solo 3 letras A–Z', () => {
    expect(validInitials('ABC')).toBe(true);
    expect(validInitials('AB')).toBe(false);
    expect(validInitials('AB1')).toBe(false);
  });

  it('bloquea groserías e insultos (misma lista que el servidor)', () => {
    expect(blockedInitials('hdp')).toBe(true);
    expect(blockedInitials('KKK')).toBe(true);
    expect(allowedInitials('ABU')).toBe(true);
    expect(allowedInitials('FUK')).toBe(false);
    expect(BLOCKED.every((x: string) => /^[A-Z]{3}$/.test(x))).toBe(true);
    expect(new Set(BLOCKED).size).toBe(BLOCKED.length);
  });
});
