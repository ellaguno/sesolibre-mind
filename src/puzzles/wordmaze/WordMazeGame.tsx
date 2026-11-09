import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../core/registry';
import { resolveLang, useT } from '../../core/i18n';
import { useSettings } from '../../core/settings';
import { AudioService } from '../../core/AudioService';
import PuzzleShell from '../common/PuzzleShell';
import { useSavedPuzzle } from '../../core/progress';
import { useActivityLevel } from '../../core/levels';
import { useTutorialOpen } from '../../core/tutorials';
import { useWorkerResult } from '../common/useWorkerResult';
import { usePuzzleSession } from '../common/usePuzzleSession';
import { boardSeed } from '../common/boardSeed';
import { themesFor } from '../../words/themes';
import type { Lang } from '../../core/i18n';
import { wordMazeSlides } from './tutorial';
import { VARIANTS, generateWordMaze, type Variant } from './generator';
import { checkTrace, linked, nextHint, wallSet } from './logic';

const makeWorker = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const generateInline = (a: { seed: number; variant: Variant; lang: Lang }) =>
  generateWordMaze(a.seed, a.variant, themesFor(a.lang));

/** Colores de las palabras encontradas (fondo de casilla y trazo). */
const COLORS = [
  ['#c7d2fe', '#6366f1'],
  ['#bbf7d0', '#16a34a'],
  ['#fde68a', '#d97706'],
  ['#fbcfe8', '#db2777'],
  ['#a5f3fc', '#0891b2'],
  ['#fed7aa', '#ea580c'],
  ['#ddd6fe', '#7c3aed'],
  ['#d9f99d', '#65a30d'],
  ['#fecaca', '#dc2626'],
];

export default function WordMazeGame({
  onScore,
  onExit,
  seed,
  daily,
  inSession,
  challenge,
}: GameProps) {
  const t = useT();
  const appLang = resolveLang(useSettings((s) => s.lang));
  // Un reto se juega en el idioma de quien retó (mismo tablero).
  const lang = challenge?.lang ?? appLang;
  const [variantId, setVariantId] = useActivityLevel(
    'wordmaze',
    daily || !!inSession,
    challenge?.level,
  );
  const variant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[1];
  const { size } = variant;
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, number>>({});

  const savedGame = useSavedPuzzle('wordmaze', daily);
  // Lo guardado lleva el idioma: no se retoma en otro idioma (sería otro tablero).
  const saveLevel = `${variant.id}:${lang}`;
  const resumeSeed =
    !challenge && round === 0 && savedGame.saved?.level === saveLevel
      ? savedGame.saved.seed
      : null;
  const bseed = resumeSeed ?? boardSeed(seed, daily || !!challenge, round, variant.id);
  const key = `${bseed}:${variant.id}:${lang}`;
  const generated = useWorkerResult(
    key,
    makeWorker,
    { seed: bseed, variant, lang },
    generateInline,
  );
  const puzzle = generated?.puzzle;
  const walls = useMemo(
    () => (puzzle ? wallSet(puzzle.walls) : new Set<number>()),
    [puzzle],
  );

  const tutorialOpen = useTutorialOpen('wordmaze');
  const session = usePuzzleSession<number>({
    boardKey: generated ? key : null,
    initial: () => [],
    isSolved: (found) => !!puzzle && found.length === puzzle.words.length,
    canRestore: (saved) =>
      !!puzzle &&
      new Set(saved).size === saved.length &&
      saved.every((k) => Number.isInteger(k) && k >= 0 && k < puzzle.words.length),
    paused: tutorialOpen,
    persist: challenge
      ? undefined
      : {
          activityId: 'wordmaze',
          daily,
          seed: bseed,
          level: saveLevel,
          restore: resumeSeed !== null ? savedGame.saved : null,
        },
    onSolved: (secs, hints) => onScore(secs, { difficulty: variant.id, hints }),
  });
  const { cells: found, cellsRef, commit, solved } = session;

  // Trazo en curso (aún no es una jugada: se confirma al soltar).
  const [trace, setTrace] = useState<number[]>([]);
  const traceRef = useRef<number[]>([]);
  const setTraceBoth = (next: number[]) => {
    traceRef.current = next;
    setTrace(next);
  };

  /** Casilla → índice de la palabra encontrada que la ocupa. */
  const owner = useMemo(() => {
    const m = new Map<number, number>();
    if (generated)
      for (const k of found) for (const c of generated.solution[k]) m.set(c, k);
    return m;
  }, [found, generated]);

  const cellAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
    return el ? Number(el.dataset.cell) : null;
  };

  const extendTo = (cell: number) => {
    let cur = traceRef.current;
    if (!cur.length || cur[cur.length - 1] === cell) return;
    // Volver sobre el trazo: recortar hasta esa casilla.
    const at = cur.indexOf(cell);
    if (at >= 0) {
      setTraceBoth(cur.slice(0, at + 1));
      return;
    }
    // Un arrastre rápido puede saltarse casillas: se avanza en línea recta.
    const head = cur[cur.length - 1];
    const [hr, hc, tr, tc] = [
      Math.floor(head / size),
      head % size,
      Math.floor(cell / size),
      cell % size,
    ];
    if (hr !== tr && hc !== tc) return;
    const step = hr === tr ? Math.sign(tc - hc) : Math.sign(tr - hr) * size;
    for (let c = head + step; ; c += step) {
      const prev = cur[cur.length - 1];
      if (owner.has(c) || cur.includes(c) || !linked(size, walls, prev, c)) break;
      cur = [...cur, c];
      if (c === cell) break;
    }
    if (cur !== traceRef.current) setTraceBoth(cur);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (solved || !puzzle) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null || owner.has(i)) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setNotice(null);
    setTraceBoth([i]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!traceRef.current.length) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i !== null) extendTo(i);
  };

  const onPointerUp = () => {
    const tr = traceRef.current;
    setTraceBoth([]);
    if (!generated || tr.length < 2) return;
    const r = checkTrace(generated, cellsRef.current, tr);
    if (r.kind === 'found') {
      AudioService.play('correct');
      commit(cellsRef.current, [...cellsRef.current, r.word]);
    } else {
      AudioService.play('wrong');
      setNotice(t(r.kind === 'otherPath' ? 'wordmaze.otherPath' : 'wordmaze.notWord'));
    }
  };

  const applyHint = () => {
    if (!generated || solved) return;
    const h = nextHint(generated, cellsRef.current, revealed);
    if (!h) return;
    session.countHint();
    const len = generated.puzzle.words[h.word].length;
    if (h.letters >= len) {
      // Ya se veía casi entera: se coloca.
      commit(cellsRef.current, [...cellsRef.current, h.word]);
    } else {
      setRevealed((m) => ({ ...m, [h.word]: h.letters }));
      session.highlight(generated.solution[h.word][h.letters - 1]);
    }
    setNotice(t('wordmaze.hintNote'));
  };

  // Casillas con letras reveladas por pistas (palabras aún no encontradas).
  const hinted = useMemo(() => {
    const m = new Map<number, number>();
    if (generated)
      for (const [k, n] of Object.entries(revealed))
        if (!found.includes(Number(k)))
          generated.solution[Number(k)].slice(0, n).forEach((c, j) => m.set(c, j));
    return m;
  }, [revealed, found, generated]);

  const center = (i: number) => `${(i % size) + 0.5},${Math.floor(i / size) + 0.5}`;
  const inTrace = useMemo(() => new Set(trace), [trace]);
  // Ranuras: por longitud (y luego por orden) para no delatar la posición.
  const slots = useMemo(
    () =>
      puzzle
        ? puzzle.words
            .map((w, k) => ({ w, k }))
            .sort((a, b) => a.w.length - b.w.length || a.k - b.k)
        : [],
    [puzzle],
  );

  const reset = () => {
    setNotice(null);
    setRevealed({});
    setTraceBoth([]);
  };

  return (
    <PuzzleShell
      emoji="🔤"
      activityId="wordmaze"
      daily={daily}
      inSession={inSession}
      challenge={challenge}
      boardSeed={bseed}
      boardLang={lang}
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
        reset();
      }}
      onNew={() => {
        setRound((r) => r + 1);
        reset();
      }}
      onExit={onExit}
      onUndo={session.undo}
      canUndo={session.canUndo}
      onClear={() => {
        setNotice(null);
        commit(cellsRef.current, []);
      }}
      onHint={applyHint}
      notice={notice}
      slides={wordMazeSlides(t, lang)}
      rules={[t('wordmaze.rule1'), t('wordmaze.rule2'), t('wordmaze.rule3')]}
      header={
        puzzle && (
          <div className="flex flex-col gap-1.5">
            <p className="text-center text-sm">
              <span className="text-app-muted">{t('wordmaze.theme')}: </span>
              <span className="font-bold">{puzzle.theme}</span>
            </p>
            <ul
              className="flex flex-wrap justify-center gap-x-3 gap-y-1.5"
              aria-live="polite"
            >
              {slots.map(({ w, k }) => {
                const done = found.includes(k);
                const shown = done ? w.length : (revealed[k] ?? 0);
                return (
                  <li
                    key={k}
                    className="flex gap-0.5"
                    aria-label={done ? w.join('') : t('wordmaze.slot', { n: w.length })}
                  >
                    {w.map((l, j) => (
                      <span
                        key={j}
                        aria-hidden
                        className={`flex h-6 w-5 items-center justify-center rounded text-sm font-bold ${
                          done
                            ? 'text-slate-900'
                            : 'border border-app-border bg-app-surface text-app-muted'
                        }`}
                        style={
                          done ? { background: COLORS[k % COLORS.length][0] } : undefined
                        }
                      >
                        {j < shown ? l : ''}
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>
          </div>
        )
      }
    >
      {puzzle && (
        <div
          className="relative h-full w-full overflow-hidden rounded-xl border-[3px] border-slate-800 bg-slate-50"
          style={{ containerType: 'inline-size' } as CSSProperties}
        >
          {/* Trazos de las palabras encontradas y del trazo en curso (debajo de las letras) */}
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            {found.map((k) => (
              <polyline
                key={k}
                points={generated!.solution[k].map(center).join(' ')}
                fill="none"
                stroke={COLORS[k % COLORS.length][1]}
                strokeWidth={0.22}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.45}
              />
            ))}
            {trace.length > 1 && (
              <polyline
                points={trace.map(center).join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth={0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.35}
              />
            )}
          </svg>

          <div
            role="grid"
            aria-label={t('act.wordmaze.title')}
            className="relative grid h-full w-full touch-none select-none"
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {puzzle.letters.map((l, i) => {
              const k = owner.get(i);
              const h = hinted.get(i);
              return (
                <div
                  key={i}
                  data-cell={i}
                  role="gridcell"
                  aria-label={t('puzzle.cell', {
                    r: Math.floor(i / size) + 1,
                    c: (i % size) + 1,
                    state: l,
                  })}
                  className={`flex items-center justify-center border-[0.5px] border-slate-300/70 font-bold text-slate-900 ${
                    inTrace.has(i) ? 'bg-indigo-200/80' : ''
                  } ${h !== undefined ? 'ring-2 ring-inset ring-amber-500' : ''} ${
                    session.flash === i ? 'animate-pulse' : ''
                  }`}
                  style={{
                    fontSize: `${46 / size}cqw`,
                    background:
                      k !== undefined ? `${COLORS[k % COLORS.length][0]}cc` : undefined,
                  }}
                >
                  {l}
                </div>
              );
            })}
          </div>

          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            {puzzle.walls.map(([a, b]) => {
              const r = Math.floor(a / size);
              const c = a % size;
              const vertical = b === a + 1;
              return (
                <line
                  key={`${a}-${b}`}
                  x1={vertical ? c + 1 : c}
                  y1={vertical ? r : r + 1}
                  x2={vertical ? c + 1 : c + 1}
                  y2={vertical ? r + 1 : r + 1}
                  stroke="#0f172a"
                  strokeWidth={0.1}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        </div>
      )}
    </PuzzleShell>
  );
}
