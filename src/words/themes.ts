import type { Lang } from '../core/i18n';
import type { Theme } from './types';
import { THEMES_ES } from './data/es';
import { THEMES_EN } from './data/en';

/** Temas del idioma de la partida (cada idioma tiene sus propias palabras). */
export function themesFor(lang: Lang): Theme[] {
  return lang === 'es' ? THEMES_ES : THEMES_EN;
}
