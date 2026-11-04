import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { findActivity, type ActivityMeta, type GameProps } from '../core/registry';
import { recordResult } from '../core/play';
import { dailySeed, dateKey } from '../core/rng';
import { useSettings } from '../core/settings';
import { useT } from '../core/i18n';
import { syncReminder } from '../core/reminder';
import { resultText, sessionShareText } from '../core/sessionText';
import { currentStreak, useRewards } from '../core/RewardService';
import {
  dailyPlan,
  isComplete,
  loadSession,
  saveSession,
  type SessionRecord,
  type StepResult,
} from '../core/session';
import Button from '../ui/Button';
import Screen from '../ui/Screen';

const lazyCache = new Map<string, LazyExoticComponent<ComponentType<GameProps>>>();
function lazyActivity(id: string) {
  let c = lazyCache.get(id);
  const a = findActivity(id);
  if (!c && a?.load) {
    c = lazy(a.load);
    lazyCache.set(id, c);
  }
  return c;
}

/** «· Nivel 2» del resultado guardado (si se sabe en qué nivel se jugó). */
function useLevelText() {
  const t = useT();
  return (a: ActivityMeta, r: StepResult | undefined) => {
    const lv = r?.meta?.difficulty;
    return typeof lv === 'string' && a.variants.includes(lv)
      ? ` · ${t('level.n', { n: a.variants.indexOf(lv) + 1 })}`
      : '';
  };
}

export default function SessionScreen() {
  const t = useT();
  const levelText = useLevelText();
  const navigate = useNavigate();
  const day = useMemo(() => dateKey(new Date()), []);
  const plan = useMemo(() => dailyPlan(day), [day]);
  const [rec, setRec] = useState<SessionRecord | null>(null);
  // -1: portada; 0..n-1: actividad en curso; n: resumen.
  const [step, setStep] = useState(-1);
  const [shared, setShared] = useState(false);
  const rewards = useRewards();
  const serene = useSettings((s) => s.serene);
  const streak = currentStreak(rewards, day, serene);

  useEffect(() => {
    void loadSession(day).then((r) => {
      setRec(r);
      if (isComplete(plan, r)) setStep(plan.steps.length);
    });
  }, [day, plan]);

  const nextPending = (r: SessionRecord) => {
    const k = plan.steps.findIndex((id) => !r.results.some((x) => x.id === id));
    return k < 0 ? plan.steps.length : k;
  };

  const currentId = step >= 0 && step < plan.steps.length ? plan.steps[step] : null;

  const onScore = useCallback(
    (score: number, meta?: Record<string, unknown>) => {
      if (!currentId) return;
      recordResult(currentId, score, meta, true);
      setRec((r) => {
        const base = r ?? { day, results: [] };
        const next = {
          ...base,
          results: [
            ...base.results.filter((x) => x.id !== currentId),
            { id: currentId, score, meta },
          ],
        };
        void saveSession(next).then(() => {
          // Sesión terminada: el aviso de hoy ya no hace falta.
          if (isComplete(plan, next)) void syncReminder();
        });
        return next;
      });
    },
    [currentId, day, plan],
  );

  // Continuar: a la siguiente actividad pendiente (o al resumen). Si se sale
  // sin terminar, se vuelve a la portada para poder retomarla.
  const onExit = useCallback(() => {
    if (!rec) return;
    const done = currentId && rec.results.some((x) => x.id === currentId);
    setStep(done ? nextPending(rec) : -1);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, currentId]);

  if (!rec) return null;

  if (currentId) {
    const Comp = lazyActivity(currentId);
    if (!Comp) return null;
    return (
      <div className="relative min-h-full">
        <div className="mx-auto max-w-lg px-4 pt-3">
          <div
            className="flex gap-1"
            aria-label={t('session.progress', { n: step + 1, total: plan.steps.length })}
          >
            {plan.steps.map((id, k) => (
              <span
                key={id}
                className={`h-1.5 flex-1 rounded-full ${
                  k < step || rec.results.some((x) => x.id === id)
                    ? 'bg-brand'
                    : k === step
                      ? 'bg-brand/50'
                      : 'bg-app-surface2'
                }`}
              />
            ))}
          </div>
        </div>
        <Suspense fallback={<div className="p-8 text-center text-app-muted">…</div>}>
          <Comp
            key={currentId}
            onScore={onScore}
            onExit={onExit}
            seed={dailySeed(day, currentId)}
            daily
            inSession
          />
        </Suspense>
      </div>
    );
  }

  const complete = isComplete(plan, rec);
  const started = rec.results.length > 0;

  const share = async () => {
    const text = sessionShareText(t, day, plan.steps, rec, streak);
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      /* cancelado o sin permiso */
    }
  };

  return (
    <Screen title={complete ? t('session.summary') : t('hub.dailyTitle')}>
      <div className="flex flex-col gap-3">
        {complete && (
          <div className="overlay-pop rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-center text-white">
            <p className="text-4xl" aria-hidden>
              🎉
            </p>
            <p className="mt-1 text-lg font-bold">{t('session.done')}</p>
            <p className="text-sm text-white/80">
              🔥 {t(streak === 1 ? 'hub.streak1' : 'hub.streak', { n: streak })}
            </p>
          </div>
        )}
        <ol className="flex flex-col gap-2">
          {plan.steps.map((id, k) => {
            const a = findActivity(id)!;
            const r = rec.results.find((x) => x.id === id);
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4"
                style={{ borderLeft: `4px solid ${a.accent}` }}
              >
                <span className="text-3xl" aria-hidden>
                  {a.emoji}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">
                    {k + 1}. {t(`act.${id}.title`)}
                  </span>
                  <span className="text-xs text-app-muted">
                    {t(
                      a.kind === 'puzzle' ? 'session.puzzleOfDay' : `domain.${a.domain}`,
                    )}
                    {levelText(a, r)}
                  </span>
                </span>
                <span
                  className={`font-mono tabular-nums ${r ? 'font-bold' : 'text-app-muted'}`}
                >
                  {r ? `✓ ${resultText(r, id)}` : '—'}
                </span>
              </li>
            );
          })}
        </ol>
        {complete ? (
          <>
            <Button onClick={() => void share()} className="py-3">
              {shared ? t('puzzle.shared') : t('puzzle.share')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')} className="py-3">
              {t('common.back')}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              setStep(nextPending(rec));
              window.scrollTo(0, 0);
            }}
            className="py-4 text-lg"
          >
            {started ? t('session.resume') : t('hub.start')}
          </Button>
        )}
        <p className="text-center text-xs text-app-muted">{t('session.note')}</p>
      </div>
    </Screen>
  );
}
