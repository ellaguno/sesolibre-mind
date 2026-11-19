import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import { animationsEnabled } from '../../core/settings';
import PuzzleShell from '../common/PuzzleShell';
import { useSavedPuzzle } from '../../core/progress';
import { useActivityLevel } from '../../core/levels';
import { useTutorialOpen } from '../../core/tutorials';
import { useWorkerResult } from '../common/useWorkerResult';
import { usePuzzleSession } from '../common/usePuzzleSession';
import { boardSeed } from '../common/boardSeed';
import { fusionSlides } from './tutorial';
import {
  VARIANTS,
  canMerge,
  generateFusion,
  isSolved,
  merge,
  moves,
  neighbors,
  solve,
  stepOf,
  type Generated,
} from './logic';

/** Color por escalón de tamaño (1, 2, 4, 8…). */
const BLOB_COLORS = [
  '#38bdf8',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#6366f1',
];
const colorOf = (v: number) => BLOB_COLORS[stepOf(v) % BLOB_COLORS.length];

/** Duración del deslizamiento de la burbuja que se funde (ms). */
const SLIDE_MS = 180;

const makeWorker = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const generateInline = (a: { seed: number; variant: string }) =>
  generateFusion(a.seed, a.variant);
interface Fx {
  /** Contador: cada fusión vuelve a montar la animación. */
  id: number;
  from: number;
  to: number;
  value: number;
}

export default function FusionGame({
  onScore,
  onExit,
  seed,
  daily,
  inSession,
  challenge,
}: GameProps) {
  const t = useT();
  const [variantId, setVariantId] = useActivityLevel(
    'fusion',
    daily || !!inSession,
    challenge?.level,
  );
  const variant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[1];
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [fx, setFx] = useState<Fx | null>(null);
  const dragFrom = useRef<number | null>(null);
  const fxCount = useRef(0);

  const savedGame = useSavedPuzzle('fusion', daily);
  const resumeSeed =
    !challenge && round === 0 && savedGame.saved?.level === variant.id
      ? savedGame.saved.seed
      : null;
  const bseed = resumeSeed ?? boardSeed(seed, daily || !!challenge, round, variant.id);
  const key = `${bseed}:${variant.id}`;
  const generated = useWorkerResult<{ seed: number; variant: string }, Generated>(
    key,
    makeWorker,
    { seed: bseed, variant: variant.id },
    generateInline,
  );
  const N = generated?.size ?? variant.size;

  const tutorialOpen = useTutorialOpen('fusion');
  const session = usePuzzleSession<number>({
    boardKey: generated ? key : null,
    initial: () => [...(generated?.board ?? [])],
    isSolved,
    paused: tutorialOpen,
    persist: challenge
      ? undefined
      : {
          activityId: 'fusion',
          daily,
          seed: bseed,
          level: variant.id,
          restore: resumeSeed !== null ? savedGame.saved : null,
        },
    onSolved: (secs, hints) => onScore(secs, { difficulty: variant.id, hints }),
  });
  const { cells, cellsRef, commit, solved } = session;

  // Escalón de la burbuja final: los diámetros se reparten hasta ese tamaño.
  const topStep = useMemo(
    () => Math.max(1, stepOf(cells.reduce((s, v) => s + v, 0) || 1)),
    [cells],
  );
  const stuck =
    session.ready && !solved && cells.length > 0 && moves(cells, N).length === 0;

  useEffect(() => {
    setSelected(null);
    setFx(null);
  }, [key]);
  useEffect(() => {
    if (!fx) return;
    const id = setTimeout(() => setFx(null), SLIDE_MS + 260);
    return () => clearTimeout(id);
  }, [fx]);

  const doMerge = (from: number, to: number) => {
    const before = cellsRef.current;
    if (solved || !canMerge(before, N, from, to)) return false;
    if (animationsEnabled()) {
      fxCount.current += 1;
      setFx({ id: fxCount.current, from, to, value: before[from] });
    }
    AudioService.play('pop');
    setSelected(null);
    setNotice(null);
    commit(before, merge(before, from, to));
    return true;
  };

  const onDown = (i: number) => {
    if (solved) return;
    if (selected !== null && selected !== i && doMerge(selected, i)) return;
    if (cellsRef.current[i] > 0) {
      setSelected(selected === i ? null : i);
      dragFrom.current = i;
    } else setSelected(null);
  };
  const onUp = (e: ReactPointerEvent) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]');
    const to = el ? Number(el.getAttribute('data-cell')) : -1;
    if (to >= 0 && to !== from) doMerge(from, to);
  };

  const applyHint = () => {
    if (!generated || solved) return;
    const path = solve(cellsRef.current, N);
    session.countHint();
    if (!path) {
      session.undo();
      setNotice(t('fusion.hintBack'));
      return;
    }
    const m = path[0];
    doMerge(m.from, m.to);
    session.highlight(m.to);
    setNotice(t('fusion.hintMove'));
  };

  const clear = () => {
    if (!generated) return;
    setNotice(null);
    setSelected(null);
    commit(cellsRef.current, [...generated.board]);
  };

  // Vecinas con las que puede fundirse la burbuja elegida.
  const targets = useMemo(
    () =>
      selected === null
        ? new Set<number>()
        : new Set(neighbors(selected, N).filter((j) => canMerge(cells, N, selected, j))),
    [selected, cells, N],
  );

  const pct = 100 / N;
  const diameter = (v: number) => 0.46 + (0.44 * Math.min(stepOf(v), topStep)) / topStep;
  const place = (i: number): CSSProperties => ({
    left: `${(i % N) * pct}%`,
    top: `${Math.floor(i / N) * pct}%`,
    width: `${pct}%`,
    height: `${pct}%`,
  });
  const blobStyle = (v: number): CSSProperties => ({
    width: `${diameter(v) * 100}%`,
    height: `${diameter(v) * 100}%`,
    background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 38%), ${colorOf(v)}`,
  });

  return (
    <PuzzleShell
      emoji="🫧"
      activityId="fusion"
      daily={daily}
      inSession={inSession}
      challenge={challenge}
      boardSeed={bseed}
      ready={!!generated && session.ready}
      elapsed={session.elapsed}
      solved={solved}
      resumed={session.resumed}
      hints={session.hints}
      label={`${N}×${N}`}
      variants={VARIANTS.map((v) => ({ id: v.id, label: `${v.size}×${v.size}` }))}
      variant={variant.id}
      onVariant={(id) => {
        setVariantId(id);
        setRound((r) => r + 1);
        setNotice(null);
      }}
      onNew={() => {
        setRound((r) => r + 1);
        setNotice(null);
      }}
      onExit={onExit}
      onUndo={() => {
        setSelected(null);
        setNotice(null);
        session.undo();
      }}
      canUndo={session.canUndo}
      onClear={clear}
      onHint={applyHint}
      notice={notice ?? (stuck ? t('fusion.stuck') : null)}
      slides={fusionSlides(t)}
      rules={[t('fusion.rule1'), t('fusion.rule2'), t('fusion.rule3')]}
    >
      <div
        className="relative h-full w-full touch-none select-none overflow-hidden rounded-2xl bg-slate-800/70"
        style={{ containerType: 'inline-size' }}
        onPointerUp={onUp}
        onPointerCancel={() => (dragFrom.current = null)}
      >
        <svg width="0" height="0" className="absolute" aria-hidden>
          <filter id="fusion-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
            <feColorMatrix
              in="b"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              result="g"
            />
            <feComposite in="SourceGraphic" in2="g" operator="atop" />
          </filter>
        </svg>

        {/* Capa de burbujas (se «derriten» juntas mientras se funden). */}
        <div
          className="absolute inset-0"
          style={fx ? { filter: 'url(#fusion-goo)' } : undefined}
          aria-hidden
        >
          {cells.map((v, i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center"
              style={place(i)}
            >
              <span className="absolute h-1.5 w-1.5 rounded-full bg-white/10" />
              {v > 0 && (
                <span
                  key={fx?.to === i ? `pop${fx.id}` : 'still'}
                  className={`rounded-full shadow-lg transition-[width,height] duration-200 ${
                    fx?.to === i ? 'blob-pop' : 'blob-idle'
                  }`}
                  style={{ ...blobStyle(v), animationDelay: `${(i % 7) * -0.37}s` }}
                />
              )}
            </div>
          ))}
          {fx && (
            <div
              key={`ghost${fx.id}`}
              className="blob-ghost flex items-center justify-center"
              style={
                {
                  ...place(fx.from),
                  // Porcentajes del propio elemento (una casilla).
                  '--dx': `${((fx.to % N) - (fx.from % N)) * 100}%`,
                  '--dy': `${(Math.floor(fx.to / N) - Math.floor(fx.from / N)) * 100}%`,
                  animationDuration: `${SLIDE_MS}ms`,
                } as CSSProperties
              }
            >
              <span className="rounded-full" style={blobStyle(fx.value)} />
            </div>
          )}
        </div>

        {/* Capa de números y toques. */}
        <div
          role="grid"
          aria-label={t('act.fusion.title')}
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${N}, 1fr)`,
            gridTemplateRows: `repeat(${N}, 1fr)`,
          }}
        >
          {cells.map((v, i) => (
            <button
              key={i}
              data-cell={i}
              role="gridcell"
              aria-selected={selected === i}
              aria-label={t('puzzle.cell', {
                r: Math.floor(i / N) + 1,
                c: (i % N) + 1,
                state: v ? String(v) : t('cell.empty'),
              })}
              onPointerDown={() => onDown(i)}
              className="relative flex items-center justify-center outline-none"
            >
              {v > 0 && (
                <span
                  key={fx?.to === i ? `pop${fx.id}` : 'still'}
                  className={`flex items-center justify-center rounded-full font-black text-white ${
                    fx?.to === i ? 'blob-pop' : ''
                  } ${
                    selected === i
                      ? 'ring-4 ring-white'
                      : targets.has(i)
                        ? 'ring-4 ring-white/50 ring-offset-0 animate-pulse'
                        : ''
                  } ${session.flash === i ? 'animate-pulse' : ''}`}
                  style={{
                    width: `${diameter(v) * 100}%`,
                    height: `${diameter(v) * 100}%`,
                    fontSize: `${(diameter(v) * 40) / N}cqw`,
                    textShadow: '0 2px 3px rgba(0,0,0,0.35)',
                  }}
                >
                  {v}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </PuzzleShell>
  );
}
