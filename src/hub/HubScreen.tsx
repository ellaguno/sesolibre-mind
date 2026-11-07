import Avatar from '../ui/Avatar';
import AppLogo from '../ui/AppLogo';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { activities, type ActivityKind, type ActivityMeta } from '../core/registry';
import { ScoreService, type ScoreEntry } from '../core/ScoreService';
import { currentStreak, useRewards } from '../core/RewardService';
import { dateKey } from '../core/rng';
import { formatActivityScore } from '../core/format';
import { useSettings } from '../core/settings';
import { useT } from '../core/i18n';
import { dailyPlan, isComplete, loadSession } from '../core/session';
import StreakCalendar from './StreakCalendar';
import StartChoiceDialog from './StartChoiceDialog';
import { hasProgress } from '../core/progress';
import { useActiveProfile, useProfiles } from '../core/profiles';
import { useLevels } from '../core/levels';

function ActivityTile({ activity }: { activity: ActivityMeta }) {
  const t = useT();
  const [best, setBest] = useState<ScoreEntry | null>(null);
  const [inProgress, setInProgress] = useState(false);
  useEffect(() => {
    void ScoreService.getDisplayBest(activity).then(setBest);
    if (activity.kind === 'puzzle') void hasProgress(activity.id).then(setInProgress);
  }, [activity]);

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-app-border bg-app-surface p-4"
      style={{ borderLeft: `4px solid ${activity.accent}` }}
    >
      <Link
        to={`/play/${activity.id}`}
        className="flex items-start gap-3 transition active:scale-[0.98]"
      >
        <span className="text-3xl" aria-hidden>
          {activity.emoji}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="font-semibold">{t(`act.${activity.id}.title`)}</span>
            {inProgress && (
              <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                ▶ {t('hub.inProgress')}
              </span>
            )}
            {!activity.available && (
              <span className="rounded-full bg-app-surface2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-app-muted">
                {t('common.soon')}
              </span>
            )}
          </span>
          <span className="text-sm text-app-muted">{t(`act.${activity.id}.desc`)}</span>
          <span className="text-xs text-app-muted">
            {t(`domain.${activity.domain}`)}
            {best &&
              ` · ${t(`best.${activity.scoreKind}`, { v: formatActivityScore(activity, best.value) })}`}
          </span>
        </span>
      </Link>
      {activity.available && activity.kind === 'puzzle' && (
        <Link
          to={`/play/${activity.id}?daily=1`}
          className="self-start rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          📅 {t('hub.dailyChallenge')}
        </Link>
      )}
    </div>
  );
}

function Section({ kind, title }: { kind: ActivityKind; title: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
        {title}
      </h2>
      {activities
        .filter((a) => a.kind === kind)
        .map((a) => (
          <ActivityTile key={a.id} activity={a} />
        ))}
    </section>
  );
}

export default function HubScreen() {
  const t = useT();
  const rewards = useRewards();
  const serene = useSettings((s) => s.serene);
  const askStart = useLevels((s) => s.loaded && s.start === null);
  const profile = useActiveProfile();
  const profileCount = useProfiles((s) => s.list.length);
  const today = dateKey(new Date());
  const streak = currentStreak(rewards, today, serene);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  useEffect(() => {
    void loadSession(today).then((r) => {
      setSessionStarted(r.results.length > 0);
      setSessionDone(isComplete(dailyPlan(today), r));
    });
  }, [today]);

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-4 py-6">
      {askStart && <StartChoiceDialog />}
      <header className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-2 text-base font-bold min-[400px]:text-xl sm:text-2xl">
            <AppLogo />
            <span className="truncate">{t('app.title')}</span>
          </h1>
          {profileCount > 1 ? (
            // Con varios perfiles, se ve quién juega (y se cambia tocando).
            <Link
              to="/profiles"
              className="flex min-w-0 items-center gap-1 text-sm font-semibold text-brand"
            >
              <span aria-hidden>
                <Avatar emoji={profile.emoji} />
              </span>
              <span className="truncate">
                {t('profiles.playingAs', { name: profile.name || t('profiles.me') })}
              </span>
            </Link>
          ) : (
            <p className="text-sm text-app-muted">{t('hub.tagline')}</p>
          )}
        </div>
        <nav className="flex shrink-0 gap-1">
          <Link
            to="/profiles"
            aria-label={t('profiles.title')}
            className="rounded-lg bg-app-surface px-2 py-1.5 text-lg hover:bg-app-surface2"
          >
            <Avatar emoji={profile.emoji} />
          </Link>
          <Link
            to="/profile"
            aria-label={t('nav.profile')}
            className="rounded-lg bg-app-surface px-2 py-1.5 text-lg hover:bg-app-surface2"
          >
            📊
          </Link>
          <Link
            to="/settings"
            aria-label={t('nav.settings')}
            className="rounded-lg bg-app-surface px-2 py-1.5 text-lg hover:bg-app-surface2"
          >
            ⚙️
          </Link>
        </nav>
      </header>

      <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('hub.dailyTitle')}</h2>
          {streak > 0 && (
            <span className="text-sm">
              🔥 {t(streak === 1 ? 'hub.streak1' : 'hub.streak', { n: streak })}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-white/80">
          {sessionDone ? t('session.doneToday') : t('hub.dailyDesc')}
        </p>
        <Link
          to="/session"
          className="mt-4 inline-block rounded-xl bg-white px-5 py-2 font-semibold text-brand-dark transition active:scale-95"
        >
          {sessionDone
            ? t('session.viewSummary')
            : sessionStarted
              ? t('session.resume')
              : t('hub.start')}
        </Link>
      </section>

      <StreakCalendar />

      <Link
        to="/challenge"
        className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 transition hover:bg-app-surface2 active:scale-[0.98]"
      >
        <span className="text-3xl" aria-hidden>
          🤝
        </span>
        <span className="flex flex-col">
          <span className="font-semibold">{t('challenge.hubTitle')}</span>
          <span className="text-sm text-app-muted">{t('challenge.hubDesc')}</span>
        </span>
      </Link>

      <Section kind="exercise" title={t('hub.exercises')} />
      <Section kind="puzzle" title={t('hub.puzzles')} />

      <footer className="pb-4 text-center text-xs text-app-muted">
        {t('hub.footer')} · v{__APP_VERSION__}
      </footer>
    </main>
  );
}
