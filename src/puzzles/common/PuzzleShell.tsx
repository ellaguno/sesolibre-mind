import { useState, type ReactNode } from 'react';
import { useT } from '../../core/i18n';
import { formatDuration } from '../../core/format';
import { shareText } from './share';
import Button from '../../ui/Button';

export interface VariantOption {
  id: string;
  label: string;
}

interface Props {
  emoji: string;
  /** id de la actividad (textos `act.<id>.title`). */
  activityId: string;
  daily: boolean;
  inSession?: boolean;
  ready: boolean;
  elapsed: number;
  solved: boolean;
  hints: number;
  /** Texto corto de la partida (p. ej. "7×7") para el resumen y el compartir. */
  label: string;
  variants?: readonly VariantOption[];
  variant?: string;
  onVariant?: (id: string) => void;
  onNew: () => void;
  onExit: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onClear: () => void;
  onHint: () => void;
  /** Mensaje bajo los botones (p. ej. la explicación de una pista). */
  notice?: string | null;
  rules: string[];
  /** Controles propios del puzzle entre el tablero y los botones (p. ej. teclado numérico). */
  controls?: ReactNode;
  children: ReactNode;
}

/**
 * Marco común de los puzzles: encabezado con cronómetro, selector de variante,
 * tablero (children), pantalla de victoria, botones y reglas.
 */
export default function PuzzleShell(p: Props) {
  const t = useT();
  const [shared, setShared] = useState(false);
  const title = t(`act.${p.activityId}.title`);

  const share = async () => {
    const text = shareText({ ...p, title });
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      /* cancelado por el usuario o sin permiso de portapapeles */
    }
  };

  const startNew = () => {
    setShared(false);
    p.onNew();
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
        <h1 className="flex-1 text-xl font-bold">
          {p.emoji} {title}
          {p.daily && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 align-middle text-xs text-white">
              {t('puzzle.daily')}
            </span>
          )}
        </h1>
        <span className="font-mono text-lg tabular-nums" aria-label={t('puzzle.time')}>
          {formatDuration(p.elapsed)}
        </span>
      </header>

      {!p.daily && !p.inSession && p.variants && (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t('puzzle.size')}
        >
          {p.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setShared(false);
                p.onVariant?.(v.id);
              }}
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

      <div className="relative aspect-square w-full">
        {p.ready ? (
          p.children
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border-[3px] border-slate-800 text-app-muted">
            {t('puzzle.generating')}
          </div>
        )}

        {p.solved && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/60 p-4">
            <div className="overlay-pop flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-app-surface p-6 text-center shadow-xl">
              <span className="text-5xl" aria-hidden>
                {p.emoji}
              </span>
              <h2 className="text-xl font-bold">{t('puzzle.solved')}</h2>
              <p className="text-app-muted">
                {p.label} · {formatDuration(p.elapsed)}
                {p.hints > 0 && ` · ${t('puzzle.hintsUsed', { n: p.hints })}`}
              </p>
              <Button onClick={() => void share()} className="w-full">
                {shared ? t('puzzle.shared') : t('puzzle.share')}
              </Button>
              {!p.daily && !p.inSession && (
                <Button variant="ghost" onClick={startNew} className="w-full">
                  {t('puzzle.new')}
                </Button>
              )}
              <Button
                variant={p.inSession ? 'primary' : 'ghost'}
                onClick={p.onExit}
                className="w-full"
              >
                {p.inSession ? t('session.continue') : t('common.back')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {p.controls}

      <div className="grid grid-cols-3 gap-2">
        <Button variant="ghost" onClick={p.onUndo} disabled={!p.canUndo || p.solved}>
          {t('puzzle.undo')}
        </Button>
        <Button variant="ghost" onClick={p.onClear} disabled={!p.ready || p.solved}>
          {t('puzzle.clear')}
        </Button>
        <Button variant="ghost" onClick={p.onHint} disabled={!p.ready || p.solved}>
          💡 {t('puzzle.hint')}
        </Button>
      </div>

      <p
        className="min-h-[1.25rem] text-center text-sm text-app-muted"
        aria-live="polite"
      >
        {p.notice ?? ''}
      </p>

      <details className="rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">{t('puzzle.howto')}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-app-muted">
          {p.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
    </main>
  );
}
