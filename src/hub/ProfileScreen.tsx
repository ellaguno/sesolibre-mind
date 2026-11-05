import { useEffect, useState } from 'react';
import Screen from '../ui/Screen';
import { useT } from '../core/i18n';
import { computeProfile, weeklyActiveDays, type DomainIndex } from '../core/profile';
import { Link } from 'react-router-dom';
import { useRewards } from '../core/RewardService';
import { useSettings } from '../core/settings';
import { PASSES_TO_PROMOTE, levelOf, passesOf, useLevels } from '../core/levels';
import { activities } from '../core/registry';

/** Modo sereno: progreso por niveles (sin números de rendimiento). */
function LevelProgress() {
  const t = useT();
  const levels = useLevels();
  const list = activities.filter((a) => a.available);
  const passed = list.reduce(
    (n, a) =>
      n + a.variants.filter((v) => passesOf(levels, a.id, v) >= PASSES_TO_PROMOTE).length,
    0,
  );
  return (
    <section className="rounded-2xl border border-app-border bg-app-surface p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-app-muted">
        {t('profile.levels')}
      </h2>
      <p className="mb-3 text-sm text-app-muted">
        {t('profile.levelsPassed', { n: passed })}
      </p>
      <ul className="flex flex-col gap-2">
        {list.map((a) => {
          const cur = levelOf(levels, a);
          const idx = a.variants.indexOf(cur);
          return (
            <li key={a.id} className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>
                {a.emoji}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{t(`act.${a.id}.title`)}</span>
                <span className="text-xs text-app-muted">
                  {t('profile.levelOf', { n: idx + 1, total: a.variants.length })}
                </span>
              </span>
              <span aria-hidden className="shrink-0 tracking-tight">
                {a.variants.map((v) =>
                  passesOf(levels, a.id, v) >= PASSES_TO_PROMOTE
                    ? '⭐'
                    : v === cur
                      ? '🔸'
                      : '·',
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Perfil por habilidad: una barra por habilidad con su Índice Seso escrito. */
export default function ProfileScreen() {
  const t = useT();
  const [profile, setProfile] = useState<DomainIndex[] | null>(null);
  const bestStreak = useRewards((s) => s.bestStreak);
  const activeDayList = useRewards((s) => s.activeDays);
  const week = weeklyActiveDays(activeDayList);
  const serene = useSettings((s) => s.serene);

  useEffect(() => {
    void computeProfile().then(setProfile);
  }, []);

  const measured = profile?.filter((d) => d.value !== null) ?? [];
  const overall = measured.length
    ? Math.round(measured.reduce((s, d) => s + (d.value ?? 0), 0) / measured.length)
    : null;

  return (
    <Screen title={t('profile.title')}>
      <div className="flex flex-col gap-4">
        <section className="grid grid-cols-3 gap-2 text-center">
          {[
            serene ? ['🌱', t('profile.calm')] : [overall ?? '—', t('profile.overall')],
            [bestStreak, t('profile.bestStreak')],
            [`${week.thisWeek}/7`, t('profile.thisWeek')],
          ].map(([v, label]) => (
            <div
              key={label}
              className="rounded-2xl border border-app-border bg-app-surface p-3"
            >
              <p className="text-3xl font-black tabular-nums">{v}</p>
              <p className="text-xs text-app-muted">{label}</p>
            </div>
          ))}
        </section>

        <p className="-mt-1 text-center text-sm text-app-muted">
          {week.thisWeek > week.lastWeek
            ? `📈 ${t('profile.weekUp', { n: week.thisWeek, prev: week.lastWeek })}`
            : t('profile.weekCompare', { n: week.thisWeek, prev: week.lastWeek })}
        </p>

        {serene && <LevelProgress />}
        <section
          className={`rounded-2xl border border-app-border bg-app-surface p-4 ${serene ? 'hidden' : ''}`}
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-app-muted">
            {t('profile.byDomain')}
          </h2>
          {!profile ? (
            <p className="text-app-muted">…</p>
          ) : (
            <ul className="flex flex-col gap-3" aria-label={t('profile.byDomain')}>
              {profile.map((d) => (
                <li key={d.domain}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{t(`domain.${d.domain}`)}</span>
                    <span className="flex items-baseline gap-2 tabular-nums text-app-muted">
                      {d.delta !== null && d.delta !== 0 && (
                        <span
                          className={`text-xs font-semibold ${
                            d.delta > 0 ? 'text-green-600' : 'text-app-muted'
                          }`}
                          aria-label={t('profile.trend', { n: d.delta })}
                        >
                          {d.delta > 0 ? `▲ +${d.delta}` : `▼ ${d.delta}`}
                        </span>
                      )}
                      {d.value === null ? t('profile.noData') : `${d.value}/100`}
                    </span>
                  </div>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-app-surface2"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={d.value ?? 0}
                    aria-label={t(`domain.${d.domain}`)}
                  >
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-700"
                      style={{ width: `${d.value ?? 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-app-muted">
            {t('history.title')}
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {activities
              .filter((a) => a.available)
              .map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/history/${a.id}`}
                    className="flex items-center gap-2 rounded-xl bg-app-surface2 px-2.5 py-2 text-sm font-medium hover:bg-app-border"
                  >
                    <span aria-hidden>{a.emoji}</span>
                    <span className="truncate">{t(`act.${a.id}.title`)}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>

        <p className="text-center text-xs text-app-muted">
          {serene ? t('profile.noteSerene') : t('profile.note')}
        </p>
      </div>
    </Screen>
  );
}
