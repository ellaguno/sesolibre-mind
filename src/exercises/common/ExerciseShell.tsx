import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import Button from '../../ui/Button';
import { boardSeed } from '../../puzzles/common/boardSeed';
import { PASSES_TO_PROMOTE, passesOf, useLevels } from '../../core/levels';
import { SERENE_SLOWDOWN, useSettings } from '../../core/settings';
import { cheer } from '../../core/cheer';
import { findActivity } from '../../core/registry';
import { beatsChallenge } from '../../core/challenge';
import { shareChallenge } from '../../core/challengeShare';
import { formatActivityScore } from '../../core/format';
import { useFitText } from '../../ui/useFitText';
import OnlineCompare from '../../ui/OnlineCompare';

export interface ExerciseResult {
  /** Valor que se guarda como puntuación (según el scoreKind de la actividad). */
  score: number;
  /** Texto grande del resultado (p. ej. "0:42" o "8 dígitos"). */
  headline: string;
  /** Detalle opcional (p. ej. "2 errores"). */
  detail?: string;
  meta?: Record<string, unknown>;
  /** ¿Cumple el criterio de «nivel superado»? (cuenta para proponer subir). */
  passed: boolean;
}

export interface RunProps {
  seed: number;
  finish: (r: ExerciseResult) => void;
}

interface Props extends GameProps {
  activityId: string;
  emoji: string;
  /** Instrucciones mostradas antes de empezar. */
  instructions: string[];
  /** Variantes elegibles antes de empezar (fuera de la sesión y del reto diario). */
  variants?: { id: string; label: string }[];
  variant?: string;
  onVariant?: (id: string) => void;
  children: (run: RunProps) => ReactNode;
}

type Phase = 'intro' | 'countdown' | 'running' | 'done';

/**
 * Marco común de los ejercicios cronometrados: instrucciones → cuenta 3-2-1 →
 * ejercicio (children) → resultado. El ejercicio llama a `finish` al acabar.
 */
export default function ExerciseShell(p: Props) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('intro');
  const [count, setCount] = useState(3);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [suggest, setSuggest] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<string | null>(null);
  const levels = useLevels();
  const serene = useSettings((s) => s.serene);
  const finished = useRef(false);
  const title = t(`act.${p.activityId}.title`);
  const titleRef = useFitText<HTMLHeadingElement>(title);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      setPhase('running');
      return;
    }
    AudioService.play('tick');
    const id = setTimeout(
      () => setCount((c) => c - 1),
      serene ? 650 * SERENE_SLOWDOWN : 650,
    );
    return () => clearTimeout(id);
  }, [phase, count, serene]);

  const start = () => {
    finished.current = false;
    setCount(3);
    setPhase('countdown');
  };

  const { onScore, activityId, variant } = p;
  const finish = useCallback(
    (r: ExerciseResult) => {
      if (finished.current) return;
      finished.current = true;
      setResult(r);
      setPhase('done');
      AudioService.play('win');
      onScore(r.score, { ...r.meta, difficulty: variant });
      const next = variant
        ? useLevels.getState().recordResult(activityId, variant, r.passed)
        : null;
      setSuggest(next);
      // Nivel desbloqueado: un brillo después de la melodía final.
      if (next) setTimeout(() => AudioService.play('reward'), 1100);
    },
    [onScore, activityId, variant],
  );

  const retry = () => {
    setSuggest(null);
    setChallengeSent(false);
    setAttempt((a) => a + 1);
    start();
  };

  const labelOf = (id: string) => p.variants?.find((v) => v.id === id)?.label ?? id;
  const goNext = () => {
    if (!suggest) return;
    levels.setLevel(p.activityId, suggest);
    setSuggest(null);
    if (!canRetry) setScheduled(suggest);
    // Fuera de la sesión y del reto diario, empezar ya el nivel nuevo.
    if (canRetry) {
      setAttempt((a) => a + 1);
      start();
    }
  };

  // En un reto, la semilla es la del código (mismo ejercicio que el amigo).
  const seed = p.challenge
    ? p.challenge.seed
    : boardSeed(p.seed, p.daily, attempt, p.variant ?? '');
  const canRetry = !p.daily && !p.inSession && !p.challenge;
  const [challengeSent, setChallengeSent] = useState(false);
  const activity = findActivity(p.activityId);
  const sendChallenge = async () => {
    if (!result || !p.variant) return;
    const ok = await shareChallenge(t, {
      activityId: p.activityId,
      level: p.variant,
      seed,
      score: result.score,
    });
    if (ok) setChallengeSent(true);
  };

  return (
    <main className="mx-auto flex min-h-app max-w-lg flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-3">
        <button
          onClick={p.onExit}
          aria-label={t('common.back')}
          className="rounded-lg bg-app-surface px-3 py-2 text-lg hover:bg-app-surface2"
        >
          ←
        </button>
        <h1
          ref={titleRef}
          className="min-w-0 flex-1 truncate text-lg font-bold sm:text-xl"
        >
          {p.emoji} {title}
          {p.challenge && (
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 align-middle text-xs text-white">
              🤝 {t('challenge.badge')}
            </span>
          )}
          {p.daily && !p.inSession && !p.challenge && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 align-middle text-xs text-white">
              {t('puzzle.daily')}
            </span>
          )}
        </h1>
      </header>

      {phase === 'intro' && (
        <section className="flex flex-1 flex-col gap-4">
          <div className="rounded-2xl border border-app-border bg-app-surface p-5">
            <p className="mb-3 text-lg">{t(`act.${p.activityId}.desc`)}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-app-muted">
              {p.instructions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          {!p.daily && !p.inSession && !p.challenge && p.variants && (
            <div className="flex flex-wrap gap-2" role="group">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => p.onVariant?.(v.id)}
                  aria-pressed={v.id === p.variant}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    v.id === p.variant
                      ? 'bg-brand text-white'
                      : 'bg-app-surface hover:bg-app-surface2'
                  }`}
                >
                  {v.label}
                  {passesOf(levels, p.activityId, v.id) >= PASSES_TO_PROMOTE && (
                    <span aria-label={t('level.passed')}> ✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {p.variant && (
            <p className="text-sm text-app-muted">
              {t(`lvl.${p.activityId}.${p.variant}`)}
            </p>
          )}
          <Button onClick={start} className="mt-auto py-4 text-lg">
            {t('exercise.start')}
          </Button>
        </section>
      )}

      {phase === 'countdown' && (
        <div className="flex flex-1 items-center justify-center">
          <span key={count} className="overlay-pop text-8xl font-black text-brand">
            {count || t('exercise.go')}
          </span>
        </div>
      )}

      {phase === 'running' && (
        <section key={attempt} className="flex flex-1 flex-col">
          {p.children({ seed, finish })}
        </section>
      )}

      {phase === 'done' && result && (
        <section className="overlay-pop flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="text-6xl" aria-hidden>
            {p.emoji}
          </span>
          {serene ? (
            <>
              <p className="text-4xl font-black">{cheer(t, result.score + attempt)}</p>
              {/* En modo sereno no se muestra el tiempo: sólo los aciertos o errores. */}
              {findActivity(p.activityId)?.scoreKind !== 'time' && (
                <p className="text-2xl font-bold tabular-nums">{result.headline}</p>
              )}
              {result.detail && <p className="text-app-muted">{result.detail}</p>}
            </>
          ) : (
            <>
              <p className="text-app-muted">{t('exercise.result')}</p>
              <p className="text-5xl font-black tabular-nums">{result.headline}</p>
              {result.detail && <p className="text-app-muted">{result.detail}</p>}
            </>
          )}
          {!p.challenge && p.variant && (
            <div className="w-full max-w-xs">
              <OnlineCompare
                board={{ activityId: p.activityId, level: p.variant, daily: p.daily }}
                score={result.score}
                hints={0}
              />
            </div>
          )}
          {p.challenge && activity && (
            <div
              className={`w-full max-w-xs rounded-xl p-3 ${
                beatsChallenge(p.challenge, result.score)
                  ? 'bg-green-600/20'
                  : 'bg-amber-500/20'
              }`}
            >
              <p className="font-bold">
                {beatsChallenge(p.challenge, result.score)
                  ? `🏆 ${t('challenge.won')}`
                  : `💪 ${t('challenge.lost')}`}
              </p>
              <p className="text-sm text-app-muted">
                {t('challenge.vs', {
                  mine: formatActivityScore(activity, result.score),
                  theirs: formatActivityScore(activity, p.challenge.score),
                })}
              </p>
            </div>
          )}
          <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
            {!p.inSession && p.variant && (
              <Button
                variant={p.challenge ? 'primary' : 'ghost'}
                onClick={() => void sendChallenge()}
                className="w-full"
              >
                {challengeSent
                  ? `✓ ${t('challenge.sent')}`
                  : p.challenge
                    ? `🤝 ${t('challenge.reply')}`
                    : `🤝 ${t('challenge.send')}`}
              </Button>
            )}
            {suggest && (
              <div className="rounded-xl bg-brand/15 p-3">
                <p className="text-sm font-semibold">⭐ {t('level.unlocked')}</p>
                <Button onClick={goNext} className="mt-2 w-full">
                  {canRetry
                    ? t('level.tryNext', { level: labelOf(suggest) })
                    : t('level.setNext', { level: labelOf(suggest) })}
                </Button>
              </div>
            )}
            {scheduled && (
              <p className="text-sm font-semibold text-brand">
                ✓ {t('level.scheduled', { level: labelOf(scheduled) })}
              </p>
            )}
            {canRetry && (
              <Button onClick={retry} className="w-full">
                {t('exercise.retry')}
              </Button>
            )}
            <Button
              variant={canRetry ? 'ghost' : 'primary'}
              onClick={p.onExit}
              className="w-full"
            >
              {p.inSession ? t('session.continue') : t('common.back')}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
