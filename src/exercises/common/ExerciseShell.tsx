import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import Button from '../../ui/Button';
import { boardSeed } from '../../puzzles/common/boardSeed';

export interface ExerciseResult {
  /** Valor que se guarda como puntuación (según el scoreKind de la actividad). */
  score: number;
  /** Texto grande del resultado (p. ej. "0:42" o "8 dígitos"). */
  headline: string;
  /** Detalle opcional (p. ej. "2 errores"). */
  detail?: string;
  meta?: Record<string, unknown>;
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
  const finished = useRef(false);
  const title = t(`act.${p.activityId}.title`);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      setPhase('running');
      return;
    }
    AudioService.play('tick');
    const id = setTimeout(() => setCount((c) => c - 1), 650);
    return () => clearTimeout(id);
  }, [phase, count]);

  const start = () => {
    finished.current = false;
    setCount(3);
    setPhase('countdown');
  };

  const { onScore } = p;
  const finish = useCallback(
    (r: ExerciseResult) => {
      if (finished.current) return;
      finished.current = true;
      setResult(r);
      setPhase('done');
      AudioService.play('win');
      onScore(r.score, r.meta);
    },
    [onScore],
  );

  const retry = () => {
    setAttempt((a) => a + 1);
    start();
  };

  const seed = boardSeed(p.seed, p.daily, attempt, p.variant ?? '');
  const canRetry = !p.daily && !p.inSession;

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
        <h1 className="flex-1 text-xl font-bold">
          {p.emoji} {title}
          {p.daily && !p.inSession && (
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
          {!p.daily && !p.inSession && p.variants && (
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
                </button>
              ))}
            </div>
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
          <p className="text-app-muted">{t('exercise.result')}</p>
          <p className="text-5xl font-black tabular-nums">{result.headline}</p>
          {result.detail && <p className="text-app-muted">{result.detail}</p>}
          <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
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
