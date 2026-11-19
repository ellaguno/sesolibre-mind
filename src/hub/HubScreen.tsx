import Avatar from '../ui/Avatar';
import AppLogo from '../ui/AppLogo';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { activities, type ActivityMeta } from '../core/registry';
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

/** Días desde 1970 (fecha local): rota el orden y la sugerencia de cada día. */
const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function dayNumber(d = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** Rota una lista: cada día empieza por un elemento distinto. */
function rotate<T>(list: T[], by: number): T[] {
  if (!list.length) return list;
  const k = ((by % list.length) + list.length) % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

/** Fondo de la tarjeta: degradado con el color de la actividad. */
const tileBg = (accent: string) =>
  `radial-gradient(120% 90% at 85% 0%, ${accent}55 0%, transparent 60%), linear-gradient(160deg, ${accent}33 0%, ${accent}12 55%, transparent 100%)`;

function useTileInfo(activity: ActivityMeta) {
  const [best, setBest] = useState<ScoreEntry | null>(null);
  const [inProgress, setInProgress] = useState(false);
  useEffect(() => {
    void ScoreService.getDisplayBest(activity).then(setBest);
    if (activity.kind === 'puzzle') void hasProgress(activity.id).then(setInProgress);
  }, [activity]);
  return { best, inProgress };
}

/** Tarjeta de la cuadrícula: color de la actividad, emoji grande y su récord. */
function ActivityTile({
  activity,
  index,
  fx,
}: {
  activity: ActivityMeta;
  index: number;
  fx: boolean;
}) {
  const t = useT();
  const { best, inProgress } = useTileInfo(activity);
  return (
    <div
      className="hub-tile relative flex min-h-[8.5rem] flex-col justify-end overflow-hidden rounded-2xl border bg-app-surface p-3"
      style={{
        borderColor: `${activity.accent}55`,
        backgroundImage: tileBg(activity.accent),
        animationDelay: `${index * 45}ms`,
      }}
    >
      {/* Toda la tarjeta abre la actividad. */}
      <Link
        to={`/play/${activity.id}`}
        aria-label={t(`act.${activity.id}.title`)}
        className="absolute inset-0 z-0 transition active:scale-[0.98]"
      />
      <span
        className={`pointer-events-none absolute left-3 top-2 text-[2.6rem] leading-none drop-shadow ${fx ? 'tile-fx' : ''}`}
        aria-hidden
      >
        {activity.emoji}
      </span>
      {activity.kind === 'puzzle' && (
        <Link
          to={`/play/${activity.id}?daily=1`}
          aria-label={`${t('hub.dailyChallenge')}: ${t(`act.${activity.id}.title`)}`}
          className="absolute right-2 top-2 z-10 rounded-lg bg-black/25 px-1.5 py-1 text-sm backdrop-blur hover:bg-black/40"
        >
          📅
        </Link>
      )}
      <span className="pointer-events-none relative z-[1] flex flex-col gap-0.5">
        <span className="line-clamp-2 font-bold leading-tight">
          {t(`act.${activity.id}.title`)}
        </span>
        <span className="truncate text-xs text-app-muted">
          {inProgress
            ? `▶ ${t('hub.inProgress')}`
            : best
              ? `🏆 ${formatActivityScore(activity, best.value)}`
              : t(`domain.${activity.domain}`)}
        </span>
      </span>
    </div>
  );
}

/** «Sugerido hoy»: una actividad distinta cada día, fuera de la sesión del día. */
function FeaturedTile({ activity }: { activity: ActivityMeta }) {
  const t = useT();
  const { best } = useTileInfo(activity);
  return (
    <Link
      to={`/play/${activity.id}`}
      className="hub-tile relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-app-surface p-4 transition active:scale-[0.98]"
      style={{
        borderColor: `${activity.accent}66`,
        backgroundImage: tileBg(activity.accent),
      }}
    >
      <span className="tile-float text-5xl drop-shadow" aria-hidden>
        {activity.emoji}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-app-muted">
          ✨ {t('hub.suggested')}
        </span>
        <span className="text-lg font-bold leading-tight">
          {t(`act.${activity.id}.title`)}
        </span>
        <span className="line-clamp-2 text-sm text-app-muted">
          {t(`act.${activity.id}.desc`)}
        </span>
        {best && (
          <span className="text-xs text-app-muted">
            🏆 {formatActivityScore(activity, best.value)}
          </span>
        )}
      </span>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white"
        style={{ backgroundColor: activity.accent }}
        aria-hidden
      >
        ›
      </span>
    </Link>
  );
}

function Section({
  title,
  list,
  fxId,
  offset,
}: {
  title: string;
  list: ActivityMeta[];
  fxId: string | null;
  offset: number;
}) {
  if (!list.length) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {list.map((a, k) => (
          <ActivityTile key={a.id} activity={a} index={offset + k} fx={fxId === a.id} />
        ))}
      </div>
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
  const motion = useSettings((s) => s.motion);
  const day = dayNumber();
  const plan = useMemo(() => dailyPlan(today), [today]);
  const playable = activities.filter((a) => a.available);
  const groups = {
    exercises: rotate(
      playable.filter((a) => a.kind === 'exercise'),
      day,
    ),
    puzzles: rotate(
      playable.filter((a) => a.kind === 'puzzle' && !a.wordGame),
      day,
    ),
    words: rotate(
      playable.filter((a) => a.wordGame),
      day,
    ),
  };
  // Sugerido: algo que no esté en la sesión de hoy (para variar).
  const notInSession = playable.filter((a) => !plan.steps.includes(a.id));
  const featured = notInSession.length ? notInSession[day % notInSession.length] : null;

  // De vez en cuando un emoji de la cuadrícula da un saltito (como en SesoLibre Games).
  const [fxId, setFxId] = useState<string | null>(null);
  useEffect(() => {
    if (!motion || reducedMotion()) return;
    const ids = playable.map((a) => a.id);
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      setFxId(ids[Math.floor(Math.random() * ids.length)]);
      timer = setTimeout(
        () =>
          alive &&
          (setFxId(null), (timer = setTimeout(tick, 1800 + Math.random() * 2500))),
        900,
      );
    };
    timer = setTimeout(tick, 1500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion]);

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
      <header className="flex items-center gap-2">
        {/* Ícono grande a la izquierda; título y lema a su derecha. */}
        <AppLogo className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-tight min-[400px]:text-xl sm:text-2xl">
            {t('app.title')}
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
            <p className="truncate text-sm text-app-muted">{t('hub.tagline')}</p>
          )}
        </div>
        <nav className="flex shrink-0 gap-1 self-start">
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
        <div className="mt-4 flex items-end justify-between gap-2">
          <Link
            to="/session"
            className="inline-block rounded-xl bg-white px-5 py-2 font-semibold text-brand-dark transition active:scale-95"
          >
            {sessionDone
              ? t('session.viewSummary')
              : sessionStarted
                ? t('session.resume')
                : t('hub.start')}
          </Link>
          {/* Retos entre amigos: aquí, para dejar espacio a las actividades. */}
          <Link
            to="/challenge"
            aria-label={t('challenge.hubTitle')}
            title={t('challenge.hubTitle')}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl transition hover:bg-white/30 active:scale-95"
          >
            🤝
          </Link>
        </div>
      </section>

      <StreakCalendar />

      {featured && <FeaturedTile activity={featured} />}

      <Section
        title={t('hub.exercises')}
        list={groups.exercises}
        fxId={fxId}
        offset={0}
      />
      <Section
        title={t('hub.puzzles')}
        list={groups.puzzles}
        fxId={fxId}
        offset={groups.exercises.length}
      />
      <Section
        title={t('hub.words')}
        list={groups.words}
        fxId={fxId}
        offset={groups.exercises.length + groups.puzzles.length}
      />

      <footer className="pb-4 text-center text-xs text-app-muted">
        {t('hub.footer')} · v{__APP_VERSION__}
      </footer>
    </main>
  );
}
