import type { TFn } from './i18n';
import { findActivity } from './registry';
import { formatActivityScore } from './format';
import { encodeChallenge, type Challenge } from './challenge';

/** Texto del reto para enviar por WhatsApp, SMS, etc. */
export function challengeText(t: TFn, c: Challenge): string {
  const a = findActivity(c.activityId)!;
  const level = a.variants.indexOf(c.level) + 1;
  return t('challenge.shareText', {
    emoji: a.emoji,
    title: t(`act.${a.id}.title`),
    level,
    score: formatActivityScore(a, c.score),
    code: encodeChallenge(c),
  });
}

/** Abre el menú de compartir del sistema (o copia al portapapeles). true si se compartió. */
export async function shareChallenge(t: TFn, c: Challenge): Promise<boolean> {
  const text = challengeText(t, c);
  try {
    if (navigator.share) await navigator.share({ text });
    else await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false; // cancelado o sin permiso
  }
}
