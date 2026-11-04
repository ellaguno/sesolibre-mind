import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { formatDuration } from '../../core/format';
import { AudioService } from '../../core/AudioService';
import { dateKey, hashString } from '../../core/rng';
import Button from '../../ui/Button';
import { dailySize, generateCrowns, type GeneratedCrowns } from './generator';
import {
  CROWN,
  EMPTY,
  MARK,
  colOf,
  conflicts,
  hint as computeHint,
  isSolved,
  rowOf,
  type CellState,
} from './logic';

export const SIZES = [6, 7, 8, 9] as const;

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

/** Genera en un Web Worker (o en línea si no hay Worker, p. ej. en tests). */
function useGenerated(seed: number, size: number): GeneratedCrowns | null {
  const [data, setData] = useState<{ key: string; value: GeneratedCrowns } | null>(null);
  const key = `${seed}:${size}`;
  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setData({ key, value: generateCrowns(seed, size) });
      return;
    }
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<{ result: GeneratedCrowns }>) =>
      setData({ key, value: e.data.result });
    worker.postMessage({ id: 0, seed, size });
    return () => worker.terminate();
  }, [key, seed, size]);
  return data?.key === key ? data.value : null;
}

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

export default function CrownsGame({ onScore, onExit, seed, daily }: GameProps) {
  const t = useT();
  const [size, setSize] = useState<number>(() => (daily ? dailySize(new Date()) : 7));
  const [round, setRound] = useState(0);
  const boardSeed = useMemo(
    () => (daily ? seed : hashString(`${seed}:${round}:${size}`)),
    [daily, seed, round, size],
  );
  const generated = useGenerated(boardSeed, size);

  const [cells, setCells] = useState<CellState[]>([]);
  const [history, setHistory] = useState<CellState[][]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [hints, setHints] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [shared, setShared] = useState(false);
  const startRef = useRef(0);
  const dragRef = useRef<Drag | null>(null);
  // Copia síncrona de `cells` para el arrastre (varios pointermove por render).
  const cellsRef = useRef<CellState[]>([]);
  cellsRef.current = cells;

  // Tablero nuevo: reiniciar la partida.
  useEffect(() => {
    if (!generated) return;
    setCells(new Array<CellState>(size * size).fill(EMPTY));
    setHistory([]);
    setElapsed(0);
    setHints(0);
    setSolved(false);
    setShared(false);
    startRef.current = performance.now();
  }, [generated, size]);

  // Cronómetro.
  useEffect(() => {
    if (!generated || solved) return;
    const id = setInterval(
      () => setElapsed(Math.floor((performance.now() - startRef.current) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [generated, solved]);

  const puzzle = generated?.puzzle;
  const bad = useMemo(
    () => (puzzle && cells.length ? conflicts(puzzle, cells) : new Set<number>()),
    [puzzle, cells],
  );

  // Victoria.
  useEffect(() => {
    if (!puzzle || solved || cells.length !== size * size || !isSolved(puzzle, cells))
      return;
    const secs = Math.max(1, Math.round((performance.now() - startRef.current) / 1000));
    setElapsed(secs);
    setSolved(true);
    AudioService.play('win');
    onScore(secs, { difficulty: String(size), hints });
  }, [puzzle, cells, solved, size, hints, onScore]);

  const commit = useCallback((before: CellState[], next: CellState[]) => {
    if (before.every((v, i) => v === next[i])) return;
    setHistory((h) => [...h, before].slice(-200));
    cellsRef.current = next;
    setCells(next);
  }, []);

  const cellAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
    return el ? Number(el.dataset.cell) : null;
  };

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
    cellsRef.current = next;
    setCells(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    // La posición final cuenta como último movimiento del arrastre.
    if (dragRef.current?.moved) onPointerMove(e);
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.moved) {
      commit(d.before, cellsRef.current);
      return;
    }
    cycle(d.start);
  };

  /** Toque: vacía → ✕ → corona → vacía. */
  const cycle = (i: number) => {
    if (solved) return;
    // cellsRef y no `cells`: dos toques seguidos pueden llegar antes de re-renderizar.
    const before = cellsRef.current;
    const next = [...before];
    next[i] = next[i] === EMPTY ? MARK : next[i] === MARK ? CROWN : EMPTY;
    AudioService.play(next[i] === CROWN ? 'pop' : 'click');
    commit(before, next);
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev || solved) return;
    setHistory((h) => h.slice(0, -1));
    setCells(prev);
  };

  const clear = () => {
    if (solved) return;
    commit(cells, new Array<CellState>(size * size).fill(EMPTY));
  };

  const applyHint = () => {
    if (!generated || solved) return;
    const h = computeHint(generated.puzzle, generated.solution, cells);
    if (!h) return;
    const next = [...cells];
    next[h.cell] = h.kind === 'wrong' ? EMPTY : CROWN;
    setHints((n) => n + 1);
    setFlash(h.cell);
    setTimeout(() => setFlash(null), 900);
    commit(cells, next);
  };

  const newBoard = (nextSize = size) => {
    setSize(nextSize);
    setRound((r) => r + 1);
  };

  const shareText = () => {
    const head = daily ? `SesoLibre Mind · ${dateKey(new Date())}` : 'SesoLibre Mind';
    const tail = hints ? ` · 💡${hints}` : '';
    return `${head}\n👑 ${t('act.crowns.title')} ${size}×${size} · ${formatDuration(elapsed)} ✅${tail}`;
  };

  const share = async () => {
    const text = shareText();
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      /* cancelado por el usuario o sin permiso de portapapeles */
    }
  };

  const stateLabel = (v: CellState) =>
    t(v === CROWN ? 'cell.crown' : v === MARK ? 'cell.mark' : 'cell.empty');

  return (
    <main className="mx-auto flex min-h-app max-w-lg flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-3">
        <button
          onClick={onExit}
          aria-label={t('common.back')}
          className="rounded-lg bg-app-surface px-3 py-2 text-lg hover:bg-app-surface2"
        >
          ←
        </button>
        <h1 className="flex-1 text-xl font-bold">
          👑 {t('act.crowns.title')}
          {daily && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 align-middle text-xs text-white">
              {t('puzzle.daily')}
            </span>
          )}
        </h1>
        <span className="font-mono text-lg tabular-nums" aria-label={t('puzzle.time')}>
          {formatDuration(elapsed)}
        </span>
      </header>

      {!daily && (
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label={t('puzzle.size')}
        >
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => newBoard(s)}
              aria-pressed={s === size}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                s === size
                  ? 'bg-brand text-white'
                  : 'bg-app-surface hover:bg-app-surface2'
              }`}
            >
              {s}×{s}
            </button>
          ))}
        </div>
      )}

      <div className="relative aspect-square w-full">
        {!puzzle || cells.length !== size * size ? (
          <div className="flex h-full items-center justify-center rounded-xl border-[3px] border-slate-800 text-app-muted">
            {t('puzzle.generating')}
          </div>
        ) : (
          <div
            role="grid"
            aria-label={t('act.crowns.title')}
            className="grid h-full w-full touch-none select-none overflow-hidden rounded-xl border-[3px] border-slate-800"
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {cells.map((v, i) => {
              const r = rowOf(size, i);
              const c = colOf(size, i);
              const reg = puzzle.regions[i];
              const edge = (n: number | null) =>
                n !== null && puzzle.regions[n] !== reg
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
                    flash === i ? 'animate-pulse' : ''
                  }`}
                  style={{
                    backgroundColor: REGION_COLORS[reg],
                    backgroundImage: isBad
                      ? 'repeating-linear-gradient(45deg, rgba(220,38,38,0.35) 0 6px, transparent 6px 12px)'
                      : undefined,
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
                    <span
                      aria-hidden
                      className="text-[0.55em] font-bold text-slate-700/70"
                    >
                      ✕
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {solved && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/60 p-4">
            <div className="overlay-pop flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-app-surface p-6 text-center shadow-xl">
              <span className="text-5xl" aria-hidden>
                👑
              </span>
              <h2 className="text-xl font-bold">{t('puzzle.solved')}</h2>
              <p className="text-app-muted">
                {size}×{size} · {formatDuration(elapsed)}
                {hints > 0 && ` · ${t('puzzle.hintsUsed', { n: hints })}`}
              </p>
              <Button onClick={() => void share()} className="w-full">
                {shared ? t('puzzle.shared') : t('puzzle.share')}
              </Button>
              {!daily && (
                <Button variant="ghost" onClick={() => newBoard()} className="w-full">
                  {t('puzzle.new')}
                </Button>
              )}
              <Button variant="ghost" onClick={onExit} className="w-full">
                {t('common.back')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="ghost" onClick={undo} disabled={!history.length || solved}>
          {t('puzzle.undo')}
        </Button>
        <Button variant="ghost" onClick={clear} disabled={solved}>
          {t('puzzle.clear')}
        </Button>
        <Button variant="ghost" onClick={applyHint} disabled={!puzzle || solved}>
          💡 {t('puzzle.hint')}
        </Button>
      </div>

      <details className="rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">{t('puzzle.howto')}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-app-muted">
          <li>{t('crowns.rule1')}</li>
          <li>{t('crowns.rule2')}</li>
          <li>{t('crowns.rule3')}</li>
        </ul>
      </details>
    </main>
  );
}
