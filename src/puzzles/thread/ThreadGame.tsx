import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import PuzzleShell from '../common/PuzzleShell';
import { useSavedPuzzle } from '../../core/progress';
import { useActivityLevel } from '../../core/levels';

import { useTutorialOpen } from '../../core/tutorials';
import { threadSlides } from './tutorial';
import { useWorkerResult } from '../common/useWorkerResult';
import { usePuzzleSession } from '../common/usePuzzleSession';
import { boardSeed } from '../common/boardSeed';
import { VARIANTS, generateThread, type Variant } from './generator';
import { canStep, clueOrder, hint as computeHint, isSolved, wallSet } from './logic';

const makeWorker = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const generateInline = (a: { seed: number; variant: Variant }) =>
  generateThread(a.seed, a.variant);

export default function ThreadGame({
  onScore,
  onExit,
  seed,
  daily,
  inSession,
}: GameProps) {
  const t = useT();
  const [variantId, setVariantId] = useActivityLevel('thread', daily || !!inSession);
  const variant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[0];
  const { size } = variant;
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  // Partida en curso: si hay una guardada de este nivel, se regenera su tablero.
  const savedGame = useSavedPuzzle('thread', daily);
  const resumeSeed =
    round === 0 && savedGame.saved?.level === variant.id ? savedGame.saved.seed : null;
  const bseed = resumeSeed ?? boardSeed(seed, daily, round, variant.id);
  const key = `${bseed}:${variant.id}`;
  const generated = useWorkerResult(
    key,
    makeWorker,
    { seed: bseed, variant },
    generateInline,
  );
  const puzzle = generated?.puzzle;
  const walls = useMemo(() => (puzzle ? wallSet(puzzle) : new Set<number>()), [puzzle]);
  const order = useMemo(() => (puzzle ? clueOrder(puzzle) : []), [puzzle]);

  const tutorialOpen = useTutorialOpen('thread');
  const session = usePuzzleSession<number>({
    boardKey: generated ? key : null,
    initial: () => (puzzle ? [puzzle.clues[0]] : []),
    isSolved: (path) => !!puzzle && isSolved(puzzle, path),
    paused: tutorialOpen,
    persist: {
      activityId: 'thread',
      daily,
      seed: bseed,
      level: variant.id,
      restore: resumeSeed !== null ? savedGame.saved : null,
    },
    onSolved: (secs, hints) => onScore(secs, { difficulty: variant.id, hints }),
  });
  const { cells: path, cellsRef, commit, preview, solved } = session;
  const dragRef = useRef<{ before: number[] } | null>(null);

  const cellAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
    return el ? Number(el.dataset.cell) : null;
  };

  /** Lleva la cabeza del trazo hacia `target`: retrocede o avanza casilla a casilla. */
  const moveTo = (target: number) => {
    if (!puzzle) return;
    let cur = cellsRef.current;
    if (cur[cur.length - 1] === target) return;
    // Volver sobre el trazo: recortar.
    const at = cur.indexOf(target);
    if (at >= 0) {
      cur = cur.slice(0, at + 1);
    } else {
      // Avanzar en línea recta (un arrastre rápido puede saltarse casillas).
      const head = cur[cur.length - 1];
      const [hr, hc, tr, tc] = [
        Math.floor(head / size),
        head % size,
        Math.floor(target / size),
        target % size,
      ];
      if (hr !== tr && hc !== tc) {
        if (!canStep(puzzle, walls, order, cur, target)) return;
        cur = [...cur, target];
      } else {
        const step = hr === tr ? Math.sign(tc - hc) : Math.sign(tr - hr) * size;
        for (let c = head + step; ; c += step) {
          if (!canStep(puzzle, walls, order, cur, c)) break;
          cur = [...cur, c];
          if (c === target) break;
        }
      }
    }
    if (cur !== cellsRef.current) {
      if (order[cur[cur.length - 1]] >= 0) AudioService.play('pop');
      preview(cur);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (solved || !puzzle) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { before: cellsRef.current };
    setNotice(null);
    moveTo(i);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i !== null) moveTo(i);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) onPointerMove(e);
    const d = dragRef.current;
    dragRef.current = null;
    if (d) commit(d.before, cellsRef.current);
  };

  const applyHint = () => {
    if (!generated || solved) return;
    const before = cellsRef.current;
    const h = computeHint(generated.solution, before);
    if (!h) return;
    const next = h.kind === 'back' ? before.slice(0, h.keep) : [...before, ...h.cells];
    setNotice(t(h.kind === 'back' ? 'thread.hintBack' : 'thread.hintExtend'));
    session.countHint();
    session.highlight(next[next.length - 1]);
    commit(before, next);
  };

  const center = (i: number) => `${(i % size) + 0.5},${Math.floor(i / size) + 0.5}`;
  const reached = path.reduce((m, c) => Math.max(m, order[c] ?? -1), -1);
  const inPath = useMemo(() => new Set(path), [path]);

  return (
    <PuzzleShell
      emoji="🧵"
      activityId="thread"
      daily={daily}
      inSession={inSession}
      ready={!!puzzle && session.ready}
      elapsed={session.elapsed}
      solved={solved}
      resumed={session.resumed}
      hints={session.hints}
      label={`${size}×${size}`}
      variants={VARIANTS.map((v) => ({
        id: v.id,
        label: `${v.size}×${v.size}${v.hard ? ' 🔥' : ''}`,
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
      onUndo={session.undo}
      canUndo={session.canUndo}
      onClear={() => {
        if (!puzzle) return;
        setNotice(null);
        commit(cellsRef.current, [puzzle.clues[0]]);
      }}
      onHint={applyHint}
      notice={notice}
      slides={threadSlides(t)}
      rules={[t('thread.rule1'), t('thread.rule2'), t('thread.rule3'), t('thread.rule4')]}
    >
      {puzzle && (
        <div className="relative h-full w-full overflow-hidden rounded-xl border-[3px] border-slate-800 bg-slate-50">
          <div
            role="grid"
            aria-label={t('act.thread.title')}
            className="grid h-full w-full touch-none select-none"
            style={{
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              gridTemplateRows: `repeat(${size}, 1fr)`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {Array.from({ length: size * size }, (_, i) => {
              const k = order[i];
              return (
                <div
                  key={i}
                  data-cell={i}
                  role="gridcell"
                  aria-label={t('puzzle.cell', {
                    r: Math.floor(i / size) + 1,
                    c: (i % size) + 1,
                    state: `${k >= 0 ? `${k + 1}, ` : ''}${
                      inPath.has(i) ? t('thread.visited') : t('cell.empty')
                    }`,
                  })}
                  className={`border-[0.5px] border-slate-300/70 ${
                    inPath.has(i) ? 'bg-indigo-100' : ''
                  } ${session.flash === i ? 'animate-pulse' : ''}`}
                />
              );
            })}
          </div>

          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            {/* Paredes */}
            {puzzle.walls.map(([a, b]) => {
              const r = Math.floor(a / size);
              const c = a % size;
              const vertical = b === a + 1; // pared vertical entre columnas
              return (
                <line
                  key={`${a}-${b}`}
                  x1={vertical ? c + 1 : c}
                  y1={vertical ? r : r + 1}
                  x2={vertical ? c + 1 : c + 1}
                  y2={vertical ? r + 1 : r + 1}
                  stroke="#0f172a"
                  strokeWidth={0.12}
                  strokeLinecap="round"
                />
              );
            })}
            {/* Trazo */}
            {path.length > 1 && (
              <polyline
                points={path.map(center).join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth={0.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
            )}
            {/* Números */}
            {puzzle.clues.map((cell, k) => {
              const [x, y] = center(cell).split(',').map(Number);
              const done = k <= reached;
              return (
                <g key={cell}>
                  <circle
                    cx={x}
                    cy={y}
                    r={0.32}
                    fill={done ? '#4338ca' : '#0f172a'}
                    stroke={k === 0 || done ? '#a5b4fc' : 'none'}
                    strokeWidth={0.06}
                  />
                  <text
                    x={x}
                    y={y}
                    dy="0.36em"
                    textAnchor="middle"
                    fontSize={0.36}
                    fontWeight={700}
                    fill="#fff"
                  >
                    {k + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </PuzzleShell>
  );
}
