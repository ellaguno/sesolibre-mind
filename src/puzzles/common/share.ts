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
}): string {
  const head = o.daily ? `SesoLibre Mind · ${dateKey(new Date())}` : 'SesoLibre Mind';
  const tail = o.hints ? ` · 💡${o.hints}` : '';
  return `${head}\n${o.emoji} ${o.title} ${o.label} · ${formatDuration(o.elapsed)} ✅${tail}`;
}
