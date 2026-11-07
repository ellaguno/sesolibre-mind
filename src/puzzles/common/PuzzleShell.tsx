import { useEffect, useState, type ReactNode } from 'react';
import { PASSES_TO_PROMOTE, passesOf, useLevels } from '../../core/levels';
import { useSettings } from '../../core/settings';
import { beatsChallenge, type Challenge } from '../../core/challenge';
import { shareChallenge } from '../../core/challengeShare';
import { findActivity } from '../../core/registry';
import { formatActivityScore } from '../../core/format';
import { cheer } from '../../core/cheer';
import Tutorial, { type Slide } from '../../ui/Tutorial';
import { useTutorialOpen, useTutorials } from '../../core/tutorials';
import { useT, type Lang } from '../../core/i18n';
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
  /** Reto de un amigo (mismo tablero; se compara al resolver). */
  challenge?: Challenge;
  /** Semilla del tablero actual (para generar el código de un reto). */
  boardSeed?: number;
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
  /** Se retomó una partida guardada: se avisa unos segundos. */
  resumed?: boolean;
  rules: string[];
  /** Tutorial ilustrado: se muestra la primera vez y con el botón «?». */
  slides?: Slide[];
  /** Idioma del tablero (juegos de palabras): viaja en el código del reto. */
  boardLang?: Lang;
  /** Ancho del tablero (p. ej. '80%' si el puzzle trae teclado propio y no cabría). */
  boardWidth?: string;
  /** Contenido propio sobre el tablero (p. ej. el tema y las palabras por encontrar). */
  header?: ReactNode;
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
  const tutorialOpen = useTutorialOpen(p.activityId);
  const markSeen = useTutorials((s) => s.markSeen);
  const openHelp = useTutorials((s) => s.openHelp);
  const showTutorial = !!p.slides && tutorialOpen;
  const closeTutorial = () => markSeen(p.activityId);

  // Escalera de niveles: al resolver (con 0–1 pistas) cuenta como aprobado y,
  // si toca, se propone el siguiente nivel.
  const levels = useLevels();
  // Modo sereno: sin cronómetro a la vista y las pistas no impiden superar el nivel.
  const serene = useSettings((s) => s.serene);
  const [suggest, setSuggest] = useState<string | null>(null);
  // En el reto del día y en la sesión el tablero en curso no cambia: subir de
  // nivel queda para la próxima vez.
  const deferred = p.daily || !!p.inSession || !!p.challenge;
  const [scheduled, setScheduled] = useState<string | null>(null);
  const { solved, hints, variant, activityId } = p;
  useEffect(() => {
    if (!solved) {
      setSuggest(null);
      setScheduled(null);
      return;
    }
    if (variant) {
      setSuggest(
        useLevels.getState().recordResult(activityId, variant, serene || hints <= 1),
      );
    }
  }, [solved, hints, variant, activityId, serene]);
  const goNext = () => {
    if (!suggest) return;
    levels.setLevel(p.activityId, suggest);
    if (deferred) setScheduled(suggest);
    else setShared(false);
    setSuggest(null);
  };
  const labelOf = (id: string) => p.variants?.find((v) => v.id === id)?.label ?? id;

  // Reto entre amigos: retar con este tablero o devolver el reto recibido.
  const [challengeSent, setChallengeSent] = useState(false);
  // Al resolver se puede ocultar el resumen para ver cómo quedó el tablero.
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    if (!p.solved) {
      setChallengeSent(false);
      setPeek(false);
    }
  }, [p.solved]);
  const activity = findActivity(p.activityId);
  const canChallenge = !p.inSession && p.boardSeed !== undefined && !!p.variant;
  const sendChallenge = async () => {
    if (!canChallenge) return;
    const ok = await shareChallenge(t, {
      activityId: p.activityId,
      level: p.variant!,
      seed: p.boardSeed!,
      score: p.elapsed,
      lang: p.boardLang,
    });
    if (ok) setChallengeSent(true);
  };
  const won = p.challenge ? beatsChallenge(p.challenge, p.elapsed) : false;

  const [showResumed, setShowResumed] = useState(false);
  useEffect(() => {
    if (!p.resumed) return;
    setShowResumed(true);
    const id = setTimeout(() => setShowResumed(false), 4000);
    return () => clearTimeout(id);
  }, [p.resumed]);

  const share = async () => {
    const text = shareText({ ...p, title, withTime: !serene });
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
    <main className="mx-auto flex min-h-app max-w-lg flex-col gap-3 px-4 py-3">
      {showTutorial && (
        <Tutorial title={title} slides={p.slides!} onClose={closeTutorial} />
      )}
      <header className="flex items-center gap-3">
        <button
          onClick={p.onExit}
          aria-label={t('common.back')}
          className="rounded-lg bg-app-surface px-3 py-2 text-lg hover:bg-app-surface2"
        >
          ←
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold sm:text-xl">
          {p.emoji} {title}
          {p.challenge && (
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 align-middle text-xs text-white">
              🤝 {t('challenge.badge')}
            </span>
          )}
          {p.daily && !p.challenge && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 align-middle text-xs text-white">
              {t('puzzle.daily')}
            </span>
          )}
        </h1>
        {p.slides && (
          <button
            onClick={() => openHelp(p.activityId)}
            aria-label={t('puzzle.howto')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-app-surface text-lg font-bold hover:bg-app-surface2"
          >
            ?
          </button>
        )}
        {!serene && (
          <span className="font-mono text-lg tabular-nums" aria-label={t('puzzle.time')}>
            {formatDuration(p.elapsed)}
          </span>
        )}
      </header>

      {!p.daily && !p.inSession && !p.challenge && p.variants && (
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
              {passesOf(levels, p.activityId, v.id) >= PASSES_TO_PROMOTE && (
                <span aria-label={t('level.passed')}> ✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {p.header}

      <div
        className="relative mx-auto aspect-square w-full"
        style={p.boardWidth ? { width: p.boardWidth } : undefined}
      >
        {p.ready ? (
          p.children
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border-[3px] border-slate-800 text-app-muted">
            {t('puzzle.generating')}
          </div>
        )}

        {p.solved && peek && (
          <button
            onClick={() => setPeek(false)}
            className="overlay-pop absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-lg"
          >
            {t('puzzle.showSummary')}
          </button>
        )}
        {p.solved && !peek && (
          // Fondo y tarjeta translúcidos: se alcanza a ver el tablero resuelto.
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/25 p-4">
            <div className="overlay-pop flex w-full max-w-xs flex-col items-center gap-2 rounded-2xl bg-app-surface/80 p-4 text-center shadow-xl backdrop-blur-[2px]">
              <span className="text-4xl" aria-hidden>
                {p.emoji}
              </span>
              <h2 className="text-xl font-bold">
                {serene ? cheer(t, p.elapsed) : t('puzzle.solved')}
              </h2>
              <p className="text-app-muted">
                {serene
                  ? `${p.label} · ${t('puzzle.solved')}`
                  : `${p.label} · ${formatDuration(p.elapsed)}`}
                {!serene && p.hints > 0 && ` · ${t('puzzle.hintsUsed', { n: p.hints })}`}
              </p>
              {p.challenge && activity && (
                <div
                  className={`w-full rounded-xl p-3 ${won ? 'bg-green-600/20' : 'bg-amber-500/20'}`}
                >
                  <p className="font-bold">
                    {won ? `🏆 ${t('challenge.won')}` : `💪 ${t('challenge.lost')}`}
                  </p>
                  <p className="text-sm text-app-muted">
                    {t('challenge.vs', {
                      mine: formatActivityScore(activity, p.elapsed),
                      theirs: formatActivityScore(activity, p.challenge.score),
                    })}
                  </p>
                </div>
              )}
              {suggest && (
                <div className="w-full rounded-xl bg-brand/15 p-3">
                  <p className="text-sm font-semibold">⭐ {t('level.unlocked')}</p>
                  <Button onClick={goNext} className="mt-2 w-full">
                    {deferred
                      ? t('level.setNext', { level: labelOf(suggest) })
                      : t('level.tryNext', { level: labelOf(suggest) })}
                  </Button>
                </div>
              )}
              {scheduled && (
                <p className="text-sm font-semibold text-brand">
                  ✓ {t('level.scheduled', { level: labelOf(scheduled) })}
                </p>
              )}
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  variant={suggest ? 'ghost' : 'primary'}
                  onClick={() => void share()}
                  className="w-full px-2 text-sm"
                >
                  {shared ? t('puzzle.shared') : t('puzzle.shareShort')}
                </Button>
                {canChallenge && (
                  <Button
                    variant={p.challenge ? 'primary' : 'ghost'}
                    onClick={() => void sendChallenge()}
                    className="w-full px-2 text-sm"
                  >
                    {challengeSent
                      ? `✓ ${t('challenge.sent')}`
                      : p.challenge
                        ? `🤝 ${t('challenge.replyShort')}`
                        : `🤝 ${t('challenge.sendShort')}`}
                  </Button>
                )}
                {!p.daily && !p.inSession && !p.challenge && (
                  <Button
                    variant="ghost"
                    onClick={startNew}
                    className="w-full px-2 text-sm"
                  >
                    {t('puzzle.newShort')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setPeek(true)}
                  className="w-full px-2 text-sm"
                >
                  👁 {t('puzzle.viewBoard')}
                </Button>
              </div>
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
        <Button
          variant="ghost"
          onClick={p.onUndo}
          disabled={!p.canUndo || p.solved}
          className="whitespace-nowrap px-2"
        >
          {t('puzzle.undo')}
        </Button>
        <Button
          variant="ghost"
          onClick={p.onClear}
          disabled={!p.ready || p.solved}
          className="whitespace-nowrap px-2"
        >
          {t('puzzle.clear')}
        </Button>
        <Button
          variant="ghost"
          onClick={p.onHint}
          disabled={!p.ready || p.solved}
          className="whitespace-nowrap px-2"
        >
          💡 {t('puzzle.hint')}
        </Button>
      </div>

      <p
        className="min-h-[1.25rem] text-center text-sm text-app-muted"
        aria-live="polite"
      >
        {p.notice ?? (showResumed ? `↩ ${t('puzzle.resumed')}` : '')}
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
