import { useCallback, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { useSettings } from '../../core/settings';
import { REGION_PATTERNS, layered, type Pattern } from '../../ui/patterns';
import { AudioService } from '../../core/AudioService';
import PuzzleShell from '../common/PuzzleShell';
import { useSavedPuzzle } from '../../core/progress';
import { useActivityLevel } from '../../core/levels';

import { useTutorialOpen } from '../../core/tutorials';
import { crownsSlides } from './tutorial';
import { useWorkerResult } from '../common/useWorkerResult';
import { usePuzzleSession } from '../common/usePuzzleSession';
import { boardSeed } from '../common/boardSeed';
import { generateCrowns } from './generator';
import {
  CROWN,
  EMPTY,
  MARK,
  autoMark,
  colOf,
  conflicts,
  hint as computeHint,
  isSolved,
  rowOf,
  type CellState,
} from './logic';

export const SIZES = [4, 5, 6, 7, 8, 9] as const;
const VARIANTS = SIZES.map((s) => ({ id: String(s), label: `${s}×${s}` }));

// Pasteles legibles con texto oscuro en ambos temas. El orden no importa: las
// zonas se numeran por orden de aparición, no por la fila de su corona.
const REGION_COLORS = [
  '#c4b5fd',
  '#fdba74',
  '#93c5fd',
  '#86efac',
  '#e5e7eb',
  '#fca5a5',
  '#fde047',
  '#f9a8d4',
  '#5eead4',
  '#bef264',
];

const CONFLICT: Pattern = {
  image:
    'repeating-linear-gradient(45deg, rgba(220,38,38,0.35) 0 6px, transparent 6px 12px)',
  size: 'auto',
};

const makeWorker = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const generateInline = (a: { seed: number; size: number }) =>
  generateCrowns(a.seed, a.size);

/** Celdas de la línea recta de `a` a `b` (sin `a`, con `b`). */
function cellsBetween(size: number, a: number, b: number): number[] {
  const [r0, c0, r1, c1] = [
    rowOf(size, a),
    colOf(size, a),
    rowOf(size, b),
    colOf(size, b),
  ];
  const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  const out: number[] = [];
  for (let k = 1; k <= steps; k++) {
    const r = Math.round(r0 + ((r1 - r0) * k) / steps);
    const c = Math.round(c0 + ((c1 - c0) * k) / steps);
    out.push(r * size + c);
  }
  return out;
}

interface Drag {
  start: number;
  last: number;
  moved: boolean;
  /** Valor que pinta el arrastre: ✕ si empezó en vacía, vacío si empezó en ✕. */
  paint: CellState | null;
  before: CellState[];
}

export default function CrownsGame({
  onScore,
  onExit,
  seed,
  daily,
  inSession,
}: GameProps) {
  const t = useT();
  const [level, setLevel] = useActivityLevel('crowns', daily || !!inSession);
  const size = Number(level);
  const [round, setRound] = useState(0);
  // Partida en curso: si hay una guardada de este nivel, se regenera su tablero.
  const savedGame = useSavedPuzzle('crowns', daily);
  const resumeSeed =
    round === 0 && savedGame.saved?.level === String(size) ? savedGame.saved.seed : null;
  const bseed = resumeSeed ?? boardSeed(seed, daily, round, String(size));
  const key = `${bseed}:${size}`;
  const generated = useWorkerResult(
    key,
    makeWorker,
    { seed: bseed, size },
    generateInline,
  );
  const puzzle = generated?.puzzle;

  const tutorialOpen = useTutorialOpen('crowns');
  const session = usePuzzleSession<CellState>({
    boardKey: generated ? key : null,
    initial: () => new Array<CellState>(size * size).fill(EMPTY),
    isSolved: (cells) => !!puzzle && isSolved(puzzle, cells),
    paused: tutorialOpen,
    persist: {
      activityId: 'crowns',
      daily,
      seed: bseed,
      level: String(size),
      restore: resumeSeed !== null ? savedGame.saved : null,
    },
    onSolved: (secs, hints) => onScore(secs, { difficulty: String(size), hints }),
  });
  const { cells, cellsRef, commit, preview, solved } = session;
  const dragRef = useRef<Drag | null>(null);
  const colorblind = useSettings((s) => s.colorblind);
  const serene = useSettings((s) => s.serene);

  const bad = useMemo(
    () => (puzzle && session.ready ? conflicts(puzzle, cells) : new Set<number>()),
    [puzzle, cells, session.ready],
  );

  const cellAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
    return el ? Number(el.dataset.cell) : null;
  };

  /** Toque: vacía → ✕ → corona → vacía. */
  const cycle = useCallback(
    (i: number) => {
      if (solved) return;
      const before = cellsRef.current;
      let next = [...before];
      next[i] = next[i] === EMPTY ? MARK : next[i] === MARK ? CROWN : EMPTY;
      // Modo sereno: al poner una corona se marcan solas las ✕ obvias.
      if (next[i] === CROWN && serene && puzzle) next = autoMark(puzzle, next, i);
      AudioService.play(next[i] === CROWN ? 'pop' : 'click');
      commit(before, next);
    },
    [solved, cellsRef, commit, serene, puzzle],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (solved) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const before = cellsRef.current;
    const v = before[i];
    dragRef.current = {
      start: i,
      last: i,
      moved: false,
      paint: v === EMPTY ? MARK : v === MARK ? EMPTY : null,
      before,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.paint === null) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null || i === d.last) return;
    const next = [...cellsRef.current];
    if (!d.moved) next[d.start] = d.paint;
    // Un arrastre rápido salta celdas: pintar toda la línea desde la anterior.
    for (const j of cellsBetween(size, d.last, i)) {
      if (next[j] !== CROWN) next[j] = d.paint;
    }
    d.last = i;
    d.moved = true;
    preview(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    // La posición final cuenta como último movimiento del arrastre.
    if (dragRef.current?.moved) onPointerMove(e);
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.moved) commit(d.before, cellsRef.current);
    else cycle(d.start);
  };

  const applyHint = () => {
    if (!generated || solved) return;
    const before = cellsRef.current;
    const h = computeHint(generated.puzzle, generated.solution, before);
    if (!h) return;
    let next = [...before];
    next[h.cell] = h.kind === 'wrong' ? EMPTY : CROWN;
    if (h.kind === 'place' && serene) next = autoMark(generated.puzzle, next, h.cell);
    session.countHint();
    session.highlight(h.cell);
    commit(before, next);
  };

  const stateLabel = (v: CellState) =>
    t(v === CROWN ? 'cell.crown' : v === MARK ? 'cell.mark' : 'cell.empty');

  return (
    <PuzzleShell
      emoji="👑"
      activityId="crowns"
      daily={daily}
      inSession={inSession}
      ready={!!puzzle && session.ready}
      elapsed={session.elapsed}
      solved={solved}
      resumed={session.resumed}
      hints={session.hints}
      label={`${size}×${size}`}
      variants={VARIANTS}
      variant={String(size)}
      onVariant={(id) => {
        setLevel(id);
        setRound((r) => r + 1);
      }}
      onNew={() => setRound((r) => r + 1)}
      onExit={onExit}
      onUndo={session.undo}
      canUndo={session.canUndo}
      onClear={() =>
        commit(cellsRef.current, new Array<CellState>(size * size).fill(EMPTY))
      }
      onHint={applyHint}
      slides={crownsSlides(t)}
      rules={[t('crowns.rule1'), t('crowns.rule2'), t('crowns.rule3')]}
    >
      {puzzle && (
        <div
          role="grid"
          aria-label={t('act.crowns.title')}
          className="grid h-full w-full touch-none select-none overflow-hidden rounded-xl border-[3px] border-slate-800"
          style={{
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {cells.map((v, i) => {
            const r = rowOf(size, i);
            const c = colOf(size, i);
            const reg = puzzle.regions[i];
            const edge = (n: number) =>
              puzzle.regions[n] !== reg
                ? '1.5px solid #1e293b'
                : '0.5px solid rgba(15,23,42,0.22)';
            const isBad = v === CROWN && bad.has(i);
            return (
              <div
                key={i}
                data-cell={i}
                role="gridcell"
                tabIndex={0}
                aria-label={t('puzzle.cell', {
                  r: r + 1,
                  c: c + 1,
                  state: stateLabel(v),
                })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    cycle(i);
                  }
                }}
                className={`flex items-center justify-center text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 ${
                  session.flash === i ? 'animate-pulse' : ''
                }`}
                style={{
                  backgroundColor: REGION_COLORS[reg],
                  ...layered([
                    isBad ? CONFLICT : null,
                    colorblind ? REGION_PATTERNS[reg % REGION_PATTERNS.length] : null,
                  ]),
                  borderTop: r > 0 ? edge(i - size) : undefined,
                  borderBottom: r < size - 1 ? edge(i + size) : undefined,
                  borderLeft: c > 0 ? edge(i - 1) : undefined,
                  borderRight: c < size - 1 ? edge(i + 1) : undefined,
                  fontSize: `min(${Math.round(56 / size)}vw, ${Math.round(260 / size)}px)`,
                }}
              >
                {v === CROWN && (
                  <span aria-hidden className={isBad ? 'opacity-70' : ''}>
                    👑
                  </span>
                )}
                {v === MARK && (
                  <span aria-hidden className="text-[0.55em] font-bold text-slate-700/70">
                    ✕
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PuzzleShell>
  );
}
