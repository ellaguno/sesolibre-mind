import { useMemo, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import PuzzleShell from '../common/PuzzleShell';
import { useActivityLevel } from '../../core/levels';

import { useTutorialOpen } from '../../core/tutorials';
import { sunmoonSlides } from './tutorial';
import { useWorkerResult } from '../common/useWorkerResult';
import { usePuzzleSession } from '../common/usePuzzleSession';
import { boardSeed } from '../common/boardSeed';
import { VARIANTS, dailyVariant, generateSunMoon, type Difficulty } from './generator';
import {
  EMPTY,
  MOON,
  SUN,
  hint as computeHint,
  isSolved,
  violations,
  type Cell,
} from './logic';

const VARIANT_OPTIONS = VARIANTS.map((v) => ({
  id: v.id,
  label: `${v.size}×${v.size}${v.difficulty === 'hard' ? ' 🔥' : ''}`,
}));

const makeWorker = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const generateInline = (a: { seed: number; size: number; difficulty: Difficulty }) =>
  generateSunMoon(a.seed, a.size, a.difficulty);

const SYMBOL: Record<Cell, string> = { [EMPTY]: '', [SUN]: '☀️', [MOON]: '🌙' };

export default function SunMoonGame({
  onScore,
  onExit,
  seed,
  daily,
  inSession,
}: GameProps) {
  const t = useT();
  const [variantId, setVariantId] = useActivityLevel(
    'sunmoon',
    daily ? dailyVariant(new Date()).id : undefined,
  );
  const variant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[0];
  const { size, difficulty } = variant;
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const bseed = boardSeed(seed, daily, round, variant.id);
  const key = `${bseed}:${variant.id}`;
  const generated = useWorkerResult(
    key,
    makeWorker,
    { seed: bseed, size, difficulty },
    generateInline,
  );
  const puzzle = generated?.puzzle;

  const tutorialOpen = useTutorialOpen('sunmoon');
  const session = usePuzzleSession<Cell>({
    boardKey: generated ? key : null,
    initial: () => [...(puzzle?.givens ?? [])],
    isSolved: (cells) => !!puzzle && isSolved(puzzle, cells),
    paused: tutorialOpen,
    onSolved: (secs, hints) => onScore(secs, { difficulty: variant.id, hints }),
  });
  const { cells, cellsRef, commit, solved } = session;

  const bad = useMemo(
    () =>
      puzzle && session.ready
        ? violations(puzzle, cells)
        : { cells: new Set<number>(), edges: new Set<number>() },
    [puzzle, cells, session.ready],
  );

  /** Toque: vacía → ☀️ → 🌙 → vacía. Las fijas no cambian. */
  const cycle = (i: number) => {
    if (solved || !puzzle || puzzle.givens[i] !== EMPTY) return;
    const before = cellsRef.current;
    const next = [...before];
    next[i] = next[i] === EMPTY ? SUN : next[i] === SUN ? MOON : EMPTY;
    AudioService.play(next[i] === EMPTY ? 'click' : 'pop');
    setNotice(null);
    commit(before, next);
  };

  const applyHint = () => {
    if (!generated || solved) return;
    const before = cellsRef.current;
    const h = computeHint(generated.puzzle, generated.solution, before);
    if (!h) return;
    const next = [...before];
    if (h.kind === 'wrong') {
      next[h.cell] = EMPTY;
      setNotice(t('puzzle.hintWrong'));
    } else {
      next[h.cell] = h.value;
      setNotice(
        h.line
          ? t(h.line.kind === 'row' ? 'sunmoon.hintRow' : 'sunmoon.hintCol', {
              n: h.line.index + 1,
              v: SYMBOL[h.value],
            })
          : t('puzzle.hintReveal'),
      );
    }
    session.countHint();
    session.highlight(h.cell);
    commit(before, next);
  };

  const clear = () => {
    if (!puzzle) return;
    setNotice(null);
    commit(cellsRef.current, [...puzzle.givens]);
  };

  const stateLabel = (i: number) => {
    const v = cells[i];
    const base = t(v === SUN ? 'cell.sun' : v === MOON ? 'cell.moon' : 'cell.empty');
    return puzzle?.givens[i] !== EMPTY ? `${base} ${t('cell.given')}` : base;
  };

  return (
    <PuzzleShell
      emoji="🌓"
      activityId="sunmoon"
      daily={daily}
      inSession={inSession}
      ready={!!puzzle && session.ready}
      elapsed={session.elapsed}
      solved={solved}
      hints={session.hints}
      label={VARIANT_OPTIONS.find((o) => o.id === variant.id)!.label}
      variants={VARIANT_OPTIONS}
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
      onUndo={session.undo}
      canUndo={session.canUndo}
      onClear={clear}
      onHint={applyHint}
      notice={notice}
      slides={sunmoonSlides(t)}
      rules={[
        t('sunmoon.rule1'),
        t('sunmoon.rule2'),
        t('sunmoon.rule3'),
        t('sunmoon.rule4'),
        t('sunmoon.rule5'),
      ]}
    >
      {puzzle && (
        <div className="relative h-full w-full select-none">
          <div
            role="grid"
            aria-label={t('act.sunmoon.title')}
            className="grid h-full w-full overflow-hidden rounded-xl border-[3px] border-slate-800 bg-slate-300"
            style={{
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              gridTemplateRows: `repeat(${size}, 1fr)`,
              gap: '2px',
            }}
          >
            {cells.map((v, i) => {
              const r = Math.floor(i / size);
              const c = i % size;
              const fixed = puzzle.givens[i] !== EMPTY;
              const isBad = bad.cells.has(i);
              return (
                <button
                  key={i}
                  role="gridcell"
                  aria-label={t('puzzle.cell', {
                    r: r + 1,
                    c: c + 1,
                    state: stateLabel(i),
                  })}
                  aria-disabled={fixed}
                  onClick={() => cycle(i)}
                  className={`flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
                    fixed ? 'bg-slate-200' : 'bg-slate-50 active:bg-white'
                  } ${session.flash === i ? 'animate-pulse' : ''}`}
                  style={{
                    backgroundImage: isBad
                      ? 'repeating-linear-gradient(45deg, rgba(220,38,38,0.28) 0 6px, transparent 6px 12px)'
                      : undefined,
                    fontSize: `min(${Math.round(48 / size)}vw, ${Math.round(220 / size)}px)`,
                  }}
                >
                  <span aria-hidden className={fixed ? 'opacity-90' : ''}>
                    {SYMBOL[v]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pistas = / × sobre la línea entre las dos celdas. */}
          {puzzle.edges.map((e, k) => {
            const r = Math.floor(e.a / size);
            const c = e.a % size;
            const horizontal = e.b === e.a + 1;
            const x = ((horizontal ? c + 1 : c + 0.5) / size) * 100;
            const y = ((horizontal ? r + 0.5 : r + 1) / size) * 100;
            const wrong = bad.edges.has(k);
            return (
              <span
                key={k}
                aria-hidden
                className={`pointer-events-none absolute flex h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[13px] font-bold leading-none shadow ${
                  wrong ? 'bg-red-600 text-white' : 'bg-white text-slate-700'
                }`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {e.kind === 'eq' ? '=' : '×'}
              </span>
            );
          })}
        </div>
      )}
    </PuzzleShell>
  );
}
