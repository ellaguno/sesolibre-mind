import { useEffect, useState } from 'react';
import Screen from '../ui/Screen';
import { useT } from '../core/i18n';
import { computeProfile, type DomainIndex } from '../core/profile';
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
      <ul className="flex flex-col gap-3">
        {list.map((a) => {
          const cur = levelOf(levels, a);
          const idx = a.variants.indexOf(cur);
          return (
            <li key={a.id} className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {a.emoji}
              </span>
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{t(`act.${a.id}.title`)}</span>
                <span className="text-xs text-app-muted">
                  {t('profile.levelOf', { n: idx + 1, total: a.variants.length })}
                </span>
              </span>
              <span aria-hidden className="tracking-tight">
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
  const activeDays = useRewards((s) => s.activeDays.length);
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
            [activeDays, t('profile.activeDays')],
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
                    <span className="tabular-nums text-app-muted">
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

        <p className="text-center text-xs text-app-muted">
          {serene ? t('profile.noteSerene') : t('profile.note')}
        </p>
      </div>
    </Screen>
  );
}
