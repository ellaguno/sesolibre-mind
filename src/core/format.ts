import type { ActivityMeta, ScoreKind } from './registry';
import { resolveLang, translate } from './i18n';
import { useSettings } from './settings';

/** Duración legible: m:ss, y con horas (h:mm:ss) cuando pasa de 60 minutos. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Formatea un valor de puntuación según el tipo de score del juego. */
export function formatScore(
  value: number,
  kind: ScoreKind,
  lang = resolveLang(useSettings.getState().lang),
): string {
  if (kind === 'time') return formatDuration(value);
  if (kind === 'moves') return translate(lang, 'fmt.moves', { n: value });
  return value.toLocaleString(lang);
}

/** Como formatScore, pero con la unidad propia de la actividad si la tiene. */
export function formatActivityScore(
  activity: ActivityMeta,
  value: number,
  lang = resolveLang(useSettings.getState().lang),
): string {
  if (activity.scoreKind === 'points' && activity.pointsKey) {
    return translate(lang, activity.pointsKey, { n: value });
  }
  return formatScore(value, activity.scoreKind, lang);
}
