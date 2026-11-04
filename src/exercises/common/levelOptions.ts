import { findActivity } from '../../core/registry';
import type { TFn } from '../../core/i18n';

/** Chips de nivel de un ejercicio: «Nivel 1», «Nivel 2», … */
export function levelOptions(activityId: string, t: TFn) {
  return (findActivity(activityId)?.variants ?? []).map((id, k) => ({
    id,
    label: t('level.n', { n: k + 1 }),
  }));
}
