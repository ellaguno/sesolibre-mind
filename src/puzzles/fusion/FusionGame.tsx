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
  OPS,
  VARIANTS,
  apply,
  canMerge,
  combine,
  generateFusion,
  isSolved,
  merge,
  moves,
  neighbors,
  opMoves,
  reachedTarget,
  solve,
  solveOps,
  stepOf,
  type Generated,
  type Op,
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

/** Deslizamiento de la burbuja que se funde y rebote de la que la recibe (ms). */
const SLIDE_MS = 230;
const SETTLE_MS = 700;
/** Gotitas que salpican al fundirse. */
const DROPS = 7;

const makeWorker = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const generateInline = (a: { seed: number; variant: string }) =>
  generateFusion(a.seed, a.variant);

interface Fx {
  /** Contador: cada fusión vuelve a montar la animación. */
  id: number;
  from: number;
  to: number;
  /** Valor de la burbuja que viaja y el que tenía la que la recibe. */
  value: number;
  before: number;
  /** Etiqueta que flota al fundirse (p. ej. «×3»). */
  label: string;
  /** La burbuja ya llegó: se muestra el resultado. */
  arrived: boolean;
}

interface Pick {
  from: number;
  to: number;
}

const OP_SIGN: Record<Op, string> = { '+': '+', '-': '−', '×': '×', '÷': '÷' };

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
  const ops = variant.ops;
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
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
  const target = generated?.target;

  const tutorialOpen = useTutorialOpen('fusion');
  const session = usePuzzleSession<number>({
    boardKey: generated ? key : null,
    initial: () => [...(generated?.board ?? [])],
    isSolved: (c) => (target ? reachedTarget(c, target) : isSolved(c)),
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

  // Escalón de la burbuja más grande posible: los diámetros se reparten hasta ahí.
  const topStep = useMemo(() => {
    const top = ops
      ? Math.max(target ?? 1, ...cells)
      : cells.reduce((s, v) => s + v, 0) || 1;
    return Math.max(1, stepOf(top));
  }, [cells, ops, target]);

  const ready = session.ready && !solved && cells.length > 0;
  const lone = cells.find((v) => v > 0);
  const missed = ready && ops && isSolved(cells);
  const stuck =
    ready && !missed && (ops ? opMoves(cells, N) : moves(cells, N)).length === 0;

  useEffect(() => {
    setSelected(null);
    setPick(null);
    setFx(null);
  }, [key]);
  // Fases de la animación: llega la burbuja y luego se asienta.
  useEffect(() => {
    if (!fx) return;
    const id = fx.arrived
      ? setTimeout(() => setFx(null), SETTLE_MS)
      : setTimeout(() => setFx((f) => f && { ...f, arrived: true }), SLIDE_MS);
    return () => clearTimeout(id);
  }, [fx]);

  /** Aplica una fusión ya validada (resultado en `to`, origen vacío). */
  const play = (from: number, to: number, value: number, label: string) => {
    const before = cellsRef.current;
    const next = combine(before, { from, to, op: '+', value });
    if (animationsEnabled()) {
      fxCount.current += 1;
      setFx({
        id: fxCount.current,
        from,
        to,
        value: before[from],
        before: before[to],
        label,
        arrived: false,
      });
    }
    AudioService.play('pop');
    setSelected(null);
    setPick(null);
    setNotice(null);
    commit(before, next);
  };

  const doMerge = (from: number, to: number) => {
    const b = cellsRef.current;
    if (solved || !canMerge(b, N, from, to)) return false;
    play(from, to, merge(b, from, to)[to], `+${b[from]}`);
    return true;
  };
  const doOp = (from: number, to: number, op: Op) => {
    const b = cellsRef.current;
    const value = apply(b[from], b[to], op);
    if (solved || value === null) return;
    play(from, to, value, `${OP_SIGN[op]}${Math.min(b[from], b[to])}`);
  };

  /** Intenta juntar `from` con `to`: fusión directa o, con operaciones, elegir cuál. */
  const tryJoin = (from: number, to: number) => {
    const b = cellsRef.current;
    if (!ops) return doMerge(from, to);
    if (solved || !b[from] || !b[to] || !neighbors(from, N).includes(to)) return false;
    if (!OPS.some((op) => apply(b[from], b[to], op) !== null)) return false;
    setPick({ from, to });
    setSelected(null);
    return true;
  };

  const onDown = (i: number) => {
    if (solved) return;
    if (pick) {
      setPick(null);
      return;
    }
    if (selected !== null && selected !== i && tryJoin(selected, i)) return;
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
    if (to >= 0 && to !== from) tryJoin(from, to);
  };

  const applyHint = () => {
    if (!generated || solved) return;
    setPick(null);
    const cur = cellsRef.current;
    const path = target ? solveOps(cur, N, target) : solve(cur, N);
    if (path === undefined) {
      setNotice(t('fusion.hintBusy'));
      return;
    }
    session.countHint();
    if (!path) {
      session.undo();
      setNotice(t('fusion.hintBack'));
      return;
    }
    const m = path[0];
    if ('op' in m) doOp(m.from, m.to, m.op as Op);
    else doMerge(m.from, m.to);
    session.highlight(m.to);
    setNotice(t('fusion.hintMove'));
  };

  const clear = () => {
    if (!generated) return;
    setNotice(null);
    setSelected(null);
    setPick(null);
    commit(cellsRef.current, [...generated.board]);
  };

  // Vecinas con las que puede juntarse la burbuja elegida.
  const targets = useMemo(() => {
    if (selected === null) return new Set<number>();
    return new Set(
      neighbors(selected, N).filter((j) =>
        ops
          ? cells[j] > 0 &&
            OPS.some((op) => apply(cells[selected], cells[j], op) !== null)
          : canMerge(cells, N, selected, j),
      ),
    );
  }, [selected, cells, N, ops]);

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
  /** Lo que se ve en cada casilla: mientras viaja la burbuja, la de destino aún no cambia. */
  const shown = (i: number, v: number) =>
    fx && !fx.arrived && fx.to === i ? fx.before : v;
  const blobKey = (i: number) => (fx?.to === i ? `fx${fx.id}${fx.arrived}` : 'still');
  const angle = fx
    ? Math.atan2(
        Math.floor(fx.to / N) - Math.floor(fx.from / N),
        (fx.to % N) - (fx.from % N),
      ) *
      (180 / Math.PI)
    : 0;

  const pickPos = (i: number): CSSProperties => {
    const clamp = (x: number) => Math.min(76, Math.max(24, x));
    return {
      left: `${clamp(((i % N) + 0.5) * pct)}%`,
      top: `${clamp((Math.floor(i / N) + 0.5) * pct)}%`,
    };
  };

  const label = `${N}×${N}${ops ? ' ±×÷' : ''}`;
  const status = missed
    ? t('fusion.missed', { v: lone ?? 0, t: target ?? 0 })
    : stuck
      ? t(ops ? 'fusion.stuckOps' : 'fusion.stuck')
      : ops && ready && !session.canUndo
        ? t('fusion.opsIntro')
        : null;

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
      label={label}
      variants={VARIANTS.map((v) => ({
        id: v.id,
        label: `${v.size}×${v.size}${v.ops ? ' ±×÷' : ''}`,
      }))}
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
        setPick(null);
        setNotice(null);
        session.undo();
      }}
      canUndo={session.canUndo}
      onClear={clear}
      onHint={applyHint}
      notice={notice ?? status}
      slides={fusionSlides(t)}
      rules={
        ops
          ? [t('fusion.opsRule1'), t('fusion.opsRule2'), t('fusion.opsRule3')]
          : [t('fusion.rule1'), t('fusion.rule2'), t('fusion.rule3')]
      }
      header={
        target ? (
          <p className="text-center text-lg font-bold">
            🎯 {t('fusion.target')}:{' '}
            <span className="rounded-lg bg-brand px-2 py-0.5 text-white tabular-nums">
              {target}
            </span>
          </p>
        ) : undefined
      }
    >
      <div
        className="relative h-full w-full touch-none select-none overflow-hidden rounded-2xl border-2 border-slate-400/60 bg-slate-700"
        style={{ containerType: 'inline-size' }}
        onPointerUp={onUp}
        onPointerCancel={() => (dragFrom.current = null)}
      >
        <svg width="0" height="0" className="absolute" aria-hidden>
          <filter id="fusion-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" />
            <feColorMatrix
              in="b"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
              result="g"
            />
            <feComposite in="SourceGraphic" in2="g" operator="atop" />
          </filter>
        </svg>

        {/* Capa de burbujas: mientras se funden se «derriten» juntas (filtro goo). */}
        <div
          className="absolute inset-0"
          style={fx ? { filter: 'url(#fusion-goo)' } : undefined}
          aria-hidden
        >
          {cells.map((v, i) => {
            const val = shown(i, v);
            return (
              <div
                key={i}
                className="absolute flex items-center justify-center"
                style={place(i)}
              >
                {val > 0 && (
                  <span
                    key={blobKey(i)}
                    className={`rounded-full shadow-lg ${
                      fx?.to === i
                        ? fx.arrived
                          ? 'blob-jelly'
                          : 'blob-reach'
                        : 'blob-idle'
                    }`}
                    style={
                      {
                        ...blobStyle(val),
                        animationDelay: fx?.to === i ? undefined : `${(i % 7) * -0.37}s`,
                        '--a': `${angle + 180}deg`,
                      } as CSSProperties
                    }
                  />
                )}
              </div>
            );
          })}
          {fx && !fx.arrived && (
            // La burbuja que viaja: el contenedor gira hacia el destino y ella se
            // estira, avanza y se encoge al entrar.
            <div
              key={`ghost${fx.id}`}
              className="absolute"
              style={{ ...place(fx.from), transform: `rotate(${angle}deg)` }}
            >
              <div
                className="blob-ghost"
                style={{ animationDuration: `${SLIDE_MS}ms` } as CSSProperties}
              >
                <span
                  className="rounded-full"
                  style={{ ...blobStyle(fx.value), transform: `rotate(${-angle}deg)` }}
                />
              </div>
            </div>
          )}
          {fx?.arrived && (
            // Salpicadura: gotitas que salen del punto de impacto.
            <div key={`drops${fx.id}`} className="absolute" style={place(fx.to)}>
              {Array.from({ length: DROPS }, (_, k) => (
                <span
                  key={k}
                  className="blob-drop"
                  style={
                    {
                      left: '43%',
                      top: '43%',
                      width: '14%',
                      height: '14%',
                      background: colorOf(cells[fx.to] || fx.value),
                      '--a': `${(360 / DROPS) * k + fx.id * 23}deg`,
                      '--r': `${pct * (0.38 + (k % 3) * 0.06)}cqw`,
                    } as CSSProperties
                  }
                />
              ))}
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
          {cells.map((v, i) => {
            const val = shown(i, v);
            const inPick = pick && (pick.from === i || pick.to === i);
            return (
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
                className="relative flex items-center justify-center border border-white/25 outline-none"
              >
                {val > 0 && (
                  <span
                    key={blobKey(i)}
                    className={`flex items-center justify-center rounded-full font-black text-white ${
                      fx?.to === i ? (fx.arrived ? 'blob-jelly' : 'blob-reach') : ''
                    } ${
                      selected === i || inPick
                        ? 'ring-4 ring-white'
                        : targets.has(i)
                          ? 'animate-pulse ring-4 ring-white/50'
                          : ''
                    } ${session.flash === i ? 'animate-pulse' : ''}`}
                    style={
                      {
                        width: `${diameter(val) * 100}%`,
                        height: `${diameter(val) * 100}%`,
                        fontSize: `${(diameter(val) * (val > 99 ? 30 : 40)) / N}cqw`,
                        textShadow: '0 2px 3px rgba(0,0,0,0.35)',
                        '--a': `${angle + 180}deg`,
                      } as CSSProperties
                    }
                  >
                    {val}
                  </span>
                )}
                {fx?.arrived && fx.to === i && (
                  <span
                    key={`float${fx.id}`}
                    aria-hidden
                    className="blob-float pointer-events-none absolute -top-1 font-black text-white"
                    style={{
                      fontSize: `${22 / N}cqw`,
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    {fx.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Elegir la operación (sólo con operaciones). */}
        {pick && (
          <div
            className="absolute z-10 w-[46%] -translate-x-1/2 -translate-y-1/2"
            style={pickPos(pick.to)}
          >
            <div
              role="dialog"
              aria-label={t('fusion.pick')}
              className="overlay-pop grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-900/95 p-2 shadow-2xl ring-2 ring-white/40"
            >
              {OPS.map((op) => {
                const a = cells[pick.from];
                const b = cells[pick.to];
                const r = apply(a, b, op);
                const [hi, lo] = [Math.max(a, b), Math.min(a, b)];
                const expr =
                  op === '+' || op === '×'
                    ? `${a} ${OP_SIGN[op]} ${b}`
                    : `${hi} ${OP_SIGN[op]} ${lo}`;
                return (
                  <button
                    key={op}
                    disabled={r === null}
                    onClick={() => doOp(pick.from, pick.to, op)}
                    aria-label={`${expr} = ${r ?? '—'}`}
                    className="flex flex-col items-center rounded-xl bg-app-surface2 px-1 py-1.5 font-black text-white transition active:scale-95 enabled:hover:bg-brand disabled:opacity-30"
                  >
                    <span className="text-[min(6vw,1.6rem)] leading-none">
                      {OP_SIGN[op]}
                    </span>
                    <span className="text-[min(3vw,0.8rem)] font-semibold tabular-nums text-white/80">
                      {r === null ? '—' : `= ${r}`}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => setPick(null)}
                className="col-span-2 rounded-lg py-0.5 text-xs font-semibold text-white/70 hover:text-white"
              >
                {t('fusion.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </PuzzleShell>
  );
}
