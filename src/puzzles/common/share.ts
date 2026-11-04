import { formatDuration } from '../../core/format';
import { dateKey } from '../../core/rng';

/** Texto para compartir, sin spoilers. */
export function shareText(o: {
  daily: boolean;
  emoji: string;
  title: string;
  label: string;
  elapsed: number;
  hints: number;
  /** false en modo sereno: sin tiempo. */
  withTime?: boolean;
}): string {
  const head = o.daily ? `SesoLibre Mind · ${dateKey(new Date())}` : 'SesoLibre Mind';
  const tail = o.hints ? ` · 💡${o.hints}` : '';
  const time = o.withTime === false ? '' : ` · ${formatDuration(o.elapsed)}`;
  return `${head}\n${o.emoji} ${o.title} ${o.label}${time} ✅${tail}`;
}
