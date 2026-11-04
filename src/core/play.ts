import { findActivity, scoreKey, variantFromMeta } from './registry';
import { ScoreService } from './ScoreService';
import { useRewards } from './RewardService';
import { celebrate } from '../anim/particles';

/**
 * Registra el resultado de una actividad: racha/logros, récord (por variante)
 * y celebración si es récord. Lo usan el host de actividades y la sesión diaria.
 */
export function recordResult(
  activityId: string,
  score: number,
  meta: Record<string, unknown> | undefined,
  daily: boolean,
): void {
  const a = findActivity(activityId);
  if (!a) return;
  useRewards.getState().recordPlay(a.id);
  const variant = variantFromMeta(a, meta);
  void ScoreService.submit(scoreKey(a.id, variant), score, { ...meta, daily }).then(
    (isRecord) => {
      if (isRecord) celebrate();
    },
  );
}
