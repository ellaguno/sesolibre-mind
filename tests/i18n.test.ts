import { describe, it, expect } from 'vitest';
import { missingKeys, translate } from '../src/core/i18n';
import { activities, DOMAINS } from '../src/core/registry';

describe('i18n', () => {
  it('español e inglés tienen las mismas claves', () => {
    expect(missingKeys()).toEqual({ es: [], en: [] });
  });

  it('cada actividad y habilidad tiene textos', () => {
    for (const lang of ['es', 'en'] as const) {
      for (const a of activities) {
        expect(translate(lang, `act.${a.id}.title`)).not.toBe(`act.${a.id}.title`);
        expect(translate(lang, `act.${a.id}.desc`)).not.toBe(`act.${a.id}.desc`);
      }
      for (const d of DOMAINS)
        expect(translate(lang, `domain.${d}`)).not.toBe(`domain.${d}`);
    }
  });

  it('interpola variables', () => {
    expect(translate('en', 'hub.streak', { n: 5 })).toBe('Streak: 5 days');
  });
});
