import { useMemo } from 'react';
import { useT } from '../core/i18n';
import { dateKey } from '../core/rng';
import { useRewards } from '../core/RewardService';

const WEEKS = 5;

/** Calendario de constancia: últimas semanas, un punto por día con actividad. */
export default function StreakCalendar() {
  const t = useT();
  const activeDays = useRewards((s) => s.activeDays);
  const bestStreak = useRewards((s) => s.bestStreak);
  const active = useMemo(() => new Set(activeDays), [activeDays]);

  const days = useMemo(() => {
    const today = new Date();
    // Semana empieza en lunes; la última columna incluye hoy.
    const offset = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - offset - (WEEKS - 1) * 7);
    return Array.from({ length: WEEKS * 7 }, (_, k) => {
      const d = new Date(start);
      d.setDate(start.getDate() + k);
      return { key: dateKey(d), future: d > today, today: dateKey(d) === dateKey(today) };
    });
  }, []);

  const labels = t('calendar.weekdays').split(',');
  return (
    <section className="rounded-2xl border border-app-border bg-app-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
          {t('calendar.title')}
        </h2>
        <span className="text-xs text-app-muted">
          {t('calendar.best', { n: bestStreak })}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-app-muted">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
        {days.map((d) => (
          <span
            key={d.key}
            title={d.key}
            aria-label={`${d.key}: ${active.has(d.key) ? t('calendar.active') : t('calendar.inactive')}`}
            className={`mx-auto h-5 w-5 rounded-md ${
              d.future ? 'opacity-0' : active.has(d.key) ? 'bg-brand' : 'bg-app-surface2'
            } ${d.today ? 'ring-2 ring-brand/60 ring-offset-1 ring-offset-app-surface' : ''}`}
          />
        ))}
      </div>
    </section>
  );
}
