import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { useSettings } from '../../core/settings';
import { AudioService } from '../../core/AudioService';
import PuzzleShell from '../common/PuzzleShell';
import { useActivityLevel } from '../../core/levels';

import { useTutorialOpen } from '../../core/tutorials';
import { plotsSlides } from './tutorial';
import { usePuzzleSession } from '../common/usePuzzleSession';
import { boardSeed } from '../common/boardSeed';
import { VARIANTS, dailyVariant, generatePlots } from './generator';
import {
  drawRect,
  eraseAt,
  hint as computeHint,
  isSolved,
  plotsOf,
  rectArea,
  rectBetween,
  type Rect,
  type Shape,
} from './logic';

/** Icono de forma (SVG: los caracteres ◻ ▯ ▭ no existen en muchas fuentes de móvil). */
const SHAPE_BOX: Record<Exclude<Shape, 'any'>, [number, number]> = {
  square: [9, 9],
  tall: [6, 11],
  wide: [12, 6],
};
function ShapeIcon({ shape }: { shape: Exclude<Shape, 'any'> }) {
  const [w, h] = SHAPE_BOX[shape];
  return (
    <svg viewBox="0 0 14 14" className="h-[0.7em] w-[0.7em]" aria-hidden>
      <rect
        x={(14 - w) / 2}
        y={(14 - h) / 2}
        width={w}
        height={h}
        rx={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
    </svg>
  );
}

/** Color pastel de la parcela de la pista k (tono repartido con el ángulo áureo). */
const plotColor = (k: number) => `hsl(${Math.round((k * 137.5) % 360)} 75% 78%)`;

export default function PlotsGame({
  onScore,
  onExit,
  seed,
  daily,
  inSession,
}: GameProps) {
  const t = useT();
  const [variantId, setVariantId] = useActivityLevel(
    'plots',
    daily ? dailyVariant(new Date()).id : undefined,
  );
  const variant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[0];
  const { size } = variant;
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);
  const dragRef = useRef<{ start: number; end: number } | null>(null);
  // Modo sereno: también se traza tocando una esquina y luego la opuesta.
  const serene = useSettings((s) => s.serene);
  const [anchor, setAnchor] = useState<number | null>(null);

  const bseed = boardSeed(seed, daily, round, variant.id);
  const key = `${bseed}:${variant.id}`;
  // Generar es casi instantáneo (< 15 ms): no hace falta Web Worker.
  const generated = useMemo(() => generatePlots(bseed, variant), [bseed, variant]);
  const { puzzle } = generated;

  const tutorialOpen = useTutorialOpen('plots');
  const session = usePuzzleSession<number>({
    boardKey: key,
    initial: () => new Array<number>(size * size).fill(0),
    isSolved: (cells) => isSolved(puzzle, cells),
    paused: tutorialOpen,
    onSolved: (secs, hints) => onScore(secs, { difficulty: variant.id, hints }),
  });
  const { cells, cellsRef, commit, solved } = session;

  const plots = useMemo(
    () => (session.ready ? plotsOf(puzzle, cells) : []),
    [puzzle, cells, session.ready],
  );
  const plotById = useMemo(() => new Map(plots.map((d) => [d.id, d])), [plots]);
  const clueAt = useMemo(
    () => new Map(puzzle.clues.map((k, idx) => [k.cell, idx])),
    [puzzle],
  );

  const cellAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
    return el ? Number(el.dataset.cell) : null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (solved) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { start: i, end: i };
    setDrag(dragRef.current);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null || i === d.end) return;
    dragRef.current = { ...d, end: i };
    setDrag(dragRef.current);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) onPointerMove(e);
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || solved) return;
    const before = cellsRef.current;
    if (serene && d.start === d.end) {
      // Primer toque en casilla libre: fija una esquina; segundo toque: traza.
      if (anchor === null && !before[d.start]) {
        setAnchor(d.start);
        setNotice(t('plots.tapCorner'));
        AudioService.play('click');
        return;
      }
      if (anchor !== null) {
        const next = drawRect(size, before, rectBetween(size, anchor, d.start));
        setAnchor(null);
        setNotice(null);
        AudioService.play('pop');
        commit(before, next);
        return;
      }
    }
    setAnchor(null);
    // Tocar una parcela la borra; tocar una celda libre o arrastrar traza.
    const next =
      d.start === d.end && before[d.start]
        ? eraseAt(before, d.start)
        : drawRect(size, before, rectBetween(size, d.start, d.end));
    AudioService.play(d.start === d.end && before[d.start] ? 'click' : 'pop');
    setNotice(null);
    commit(before, next);
  };

  const applyHint = () => {
    if (solved) return;
    const before = cellsRef.current;
    const h = computeHint(puzzle, generated.solution, before);
    if (!h) return;
    let next: number[];
    if (h.kind === 'wrong') {
      next = before.map((v) => (v === h.id ? 0 : v));
      setNotice(t('plots.hintWrong'));
      session.highlight(before.indexOf(h.id));
    } else {
      next = drawRect(size, before, h.rect);
      setNotice(t('plots.hintPlace', { n: puzzle.clues[h.clue].area }));
      session.highlight(puzzle.clues[h.clue].cell);
    }
    session.countHint();
    commit(before, next);
  };

  const preview: Rect | null = drag ? rectBetween(size, drag.start, drag.end) : null;
  const pct = (n: number) => `${(n / size) * 100}%`;
  const shapeLabel = (s: Shape) => (s === 'any' ? '' : ` ${t(`shape.${s}`)}`);

  return (
    <PuzzleShell
      emoji="🟩"
      activityId="plots"
      daily={daily}
      inSession={inSession}
      ready={session.ready}
      elapsed={session.elapsed}
      solved={solved}
      hints={session.hints}
      label={`${size}×${size}`}
      variants={VARIANTS.map((v) => ({
        id: v.id,
        label: `${v.size}×${v.size}${v.shapes ? '' : ' 🔥'}`,
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
        setNotice(null);
        commit(cellsRef.current, new Array<number>(size * size).fill(0));
      }}
      onHint={applyHint}
      notice={notice}
      slides={plotsSlides(t)}
      rules={[
        t('plots.rule1'),
        t('plots.rule2'),
        t('plots.rule3'),
        serene ? t('plots.rule4serene') : t('plots.rule4'),
      ]}
    >
      <div className="h-full w-full overflow-hidden rounded-xl border-[3px] border-slate-800 bg-slate-50">
        <div
          role="grid"
          aria-label={t('act.plots.title')}
          className="relative grid h-full w-full touch-none select-none"
          style={{
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {cells.map((id, i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            const plot = id ? plotById.get(id) : undefined;
            const valid = plot && plot.clue >= 0;
            const edge = (n: number) =>
              cells[n] !== id || !id ? '1.5px solid #334155' : '0.5px solid transparent';
            const thin = '0.5px solid rgba(15,23,42,0.15)';
            const k = clueAt.get(i);
            const clue = k !== undefined ? puzzle.clues[k] : null;
            return (
              <div
                key={i}
                data-cell={i}
                role="gridcell"
                aria-label={
                  clue
                    ? t('plots.clueCell', { r: r + 1, c: c + 1, n: clue.area }) +
                      shapeLabel(clue.shape)
                    : t('puzzle.cell', {
                        r: r + 1,
                        c: c + 1,
                        state: id ? t('plots.inPlot') : t('cell.empty'),
                      })
                }
                className={`flex flex-col items-center justify-center leading-none text-slate-900 ${
                  session.flash === i ? 'animate-pulse' : ''
                } ${anchor === i ? 'ring-4 ring-inset ring-brand' : ''}`}
                style={{
                  backgroundColor: valid
                    ? plotColor(plot.clue)
                    : id
                      ? '#cbd5e1'
                      : undefined,
                  backgroundImage:
                    id && !valid
                      ? 'repeating-linear-gradient(45deg, rgba(100,116,139,0.25) 0 5px, transparent 5px 10px)'
                      : undefined,
                  borderTop:
                    r > 0 ? (id || cells[i - size] ? edge(i - size) : thin) : undefined,
                  borderLeft:
                    c > 0 ? (id || cells[i - 1] ? edge(i - 1) : thin) : undefined,
                  fontSize: `min(${Math.round(42 / size)}vw, ${Math.round(190 / size)}px)`,
                }}
              >
                {clue && (
                  <>
                    {clue.shape !== 'any' && (
                      <span className="mb-0.5 text-slate-600">
                        <ShapeIcon shape={clue.shape} />
                      </span>
                    )}
                    <span className="font-bold">{clue.area}</span>
                  </>
                )}
              </div>
            );
          })}

          {preview && (
            <div
              aria-hidden
              className="pointer-events-none absolute flex items-center justify-center rounded-md border-[3px] border-dashed border-brand bg-brand/15"
              style={{
                top: pct(preview.r),
                left: pct(preview.c),
                height: pct(preview.h),
                width: pct(preview.w),
              }}
            >
              <span className="rounded bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
                {preview.h}×{preview.w} = {rectArea(preview)}
              </span>
            </div>
          )}
        </div>
      </div>
    </PuzzleShell>
  );
}
