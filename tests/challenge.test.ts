import { describe, it, expect } from 'vitest';
import {
  beatsChallenge,
  decodeChallenge,
  encodeChallenge,
  normalizeCode,
} from '../src/core/challenge';
import { activities } from '../src/core/registry';

describe('reto entre amigos', () => {
  it('ida y vuelta para todas las actividades y niveles', () => {
    for (const a of activities) {
      for (const level of a.variants) {
        for (const seed of [0, 1, 123456789, 0xffffffff]) {
          // En los juegos de palabras el idioma del tablero viaja en el código.
          for (const lang of a.wordGame ? (['es', 'en'] as const) : [undefined]) {
            const c = { activityId: a.id, level, seed, score: 97, ...(lang && { lang }) };
            const code = encodeChallenge(c);
            expect(code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
            expect(decodeChallenge(code)).toEqual(c);
          }
        }
      }
    }
  });

  it('tolera minúsculas, espacios y letras confundibles', () => {
    const code = encodeChallenge({
      activityId: 'crowns',
      level: '6',
      seed: 42,
      score: 75,
    });
    const messy = ` ${code.toLowerCase().replace(/-/g, ' ').replace(/1/g, 'l').replace(/0/g, 'o')} `;
    expect(normalizeCode(messy)).toBe(code.replace(/-/g, ''));
    expect(decodeChallenge(messy)?.seed).toBe(42);
  });

  it('rechaza códigos mal tecleados', () => {
    const code = encodeChallenge({
      activityId: 'thread',
      level: '7',
      seed: 9999,
      score: 61,
    });
    const chars = code.replace(/-/g, '').split('');
    chars[5] = chars[5] === 'A' ? 'B' : 'A';
    expect(decodeChallenge(chars.join(''))).toBeNull();
    expect(decodeChallenge('HOLA')).toBeNull();
  });

  it('compara según el tipo de puntuación (tiempo menor gana, puntos mayor gana)', () => {
    const t = { activityId: 'crowns', level: '6', seed: 1, score: 60 };
    expect(beatsChallenge(t, 55)).toBe(true);
    expect(beatsChallenge(t, 61)).toBe(false);
    const p = { activityId: 'numberspan', level: 'forward', seed: 1, score: 7 };
    expect(beatsChallenge(p, 8)).toBe(true);
    expect(beatsChallenge(p, 6)).toBe(false);
  });
});
