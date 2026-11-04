import { findActivity } from './registry';
import { formatActivityScore } from './format';
import type { TFn } from './i18n';
import type { SessionRecord, StepResult } from './session';

export function resultText(r: StepResult | undefined, id: string): string {
  const a = findActivity(id);
  if (!r || !a) return '—';
  return formatActivityScore(a, r.score);
}

/** Texto para compartir la sesión, sin spoilers. */
export function sessionShareText(
  t: TFn,
  day: string,
  steps: string[],
  rec: SessionRecord,
  streak: number,
): string {
  const lines = steps.map((id) => {
    const a = findActivity(id)!;
    const r = rec.results.find((x) => x.id === id);
    return `${a.emoji} ${t(`act.${id}.title`)}: ${resultText(r, id)}`;
  });
  return [
    `SesoLibre Mind · ${day}`,
    ...lines,
    `🔥 ${t(streak === 1 ? 'hub.streak1' : 'hub.streak', { n: streak })}`,
  ].join('\n');
}
