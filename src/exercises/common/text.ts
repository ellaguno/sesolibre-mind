import type { TFn } from '../../core/i18n';

/** "1 error" / "3 errores" (singular y plural). */
export const errorsText = (t: TFn, n: number) =>
  t(n === 1 ? 'exercise.oneError' : 'exercise.errors', { n });
