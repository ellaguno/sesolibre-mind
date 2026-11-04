import { useEffect, useMemo, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import PuzzleShell from '../common/PuzzleShell';
import { useWorkerResult } from '../common/useWorkerResult';
import { usePuzzleSession } from '../common/usePuzzleSession';
import { boardSeed } from '../common/boardSeed';
import { VARIANTS, dailyVariant, generateSudoku, type Difficulty } from './generator';
import {
  BOX_COLS,
  BOX_ROWS,
  DIGITS,
  N,
  PEERS,
  boxOf,
  colOf,
  conflicts,
  hint as computeHint,
  isSolved,
  rowOf,
} from './logic';

/**
 * Cada celda se guarda como un número: cifra en los 3 bits bajos y notas a
 * lápiz (bit d-1 para la cifra d) a partir del bit 3. Así el historial de
 * deshacer cubre también las notas.
 */
const valueOf = (cell: number) => cell & 7;
const notesOf = (cell: number) => cell >> 3;
const withNotes = (notes: number) => notes << 3;

const makeWorker = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const generateInline = (a: { seed: number; difficulty: Difficulty }) =>
  generateSudoku(a.seed, a.difficulty);

export default function MiniSudokuGame({
  onScore,
  onExit,
  seed,
  daily,
  inSession,
}: GameProps) {
  const t = useT();
  const [variantId, setVariantId] = useState<string>(() =>
    daily ? dailyVariant(new Date()).id : VARIANTS[0].id,
  );
  const variant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[0];
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);

  const bseed = boardSeed(seed, daily, round, variant.id);
  const key = `${bseed}:${variant.id}`;
  const generated = useWorkerResult(
    key,
    makeWorker,
    { seed: bseed, difficulty: variant.difficulty },
    generateInline,
  );
  const givens = generated?.givens;

  const session = usePuzzleSession<number>({
    boardKey: generated ? key : null,
    initial: () => [...(givens ?? [])],
    isSolved: (cells) => isSolved(cells.map(valueOf)),
    onSolved: (secs, hints) => onScore(secs, { difficulty: variant.id, hints }),
  });
  const { cells, cellsRef, commit, solved } = session;
  const values = useMemo(() => cells.map(valueOf), [cells]);
  const bad = useMemo(() => conflicts(values), [values]);

  // Tablero nuevo: seleccionar la primera celda libre.
  useEffect(() => {
    if (givens) setSelected(givens.indexOf(0));
  }, [givens]);

  const editable = (i: number | null): i is number =>
    i !== null && !!givens && givens[i] === 0 && !solved;

  const input = (d: number) => {
    if (!editable(selected)) return;
    const before = cellsRef.current;
    const next = [...before];
    const cur = before[selected];
    if (notesMode) {
      if (valueOf(cur)) return;
      next[selected] = withNotes(notesOf(cur) ^ (1 << (d - 1)));
      AudioService.play('click');
    } else {
      next[selected] = valueOf(cur) === d ? 0 : d;
      // Al poner una cifra se borra esa nota en las celdas que comparten unidad.
      if (next[selected]) {
        for (const p of PEERS[selected]) {
          if (!valueOf(next[p])) next[p] = withNotes(notesOf(next[p]) & ~(1 << (d - 1)));
        }
      }
      AudioService.play('pop');
    }
    setNotice(null);
    commit(before, next);
  };

  const erase = () => {
    if (!editable(selected)) return;
    const before = cellsRef.current;
    const next = [...before];
    next[selected] = 0;
    commit(before, next);
  };

  // Teclado físico: cifras, borrar, flechas y N para notas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const d = Number(e.key);
      if (d >= 1 && d <= N) input(d);
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
      else if (e.key === 'n' || e.key === 'N') setNotesMode((m) => !m);
      else if (e.key.startsWith('Arrow') && selected !== null) {
        const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const r = (rowOf(selected) + dr + N) % N;
        const c = (colOf(selected) + dc + N) % N;
        setSelected(r * N + c);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const unitName = (kind: 'row' | 'col' | 'box') => t(`unit.${kind}`);

  const applyHint = () => {
    if (!generated || solved) return;
    const before = cellsRef.current;
    const h = computeHint(generated.solution, before.map(valueOf));
    if (!h) return;
    const next = [...before];
    if (h.kind === 'wrong') {
      next[h.cell] = 0;
      setNotice(t('puzzle.hintWrong'));
    } else {
      next[h.cell] = h.value;
      const d = h.deduction;
      setNotice(
        !d
          ? t('puzzle.hintReveal')
          : d.technique === 'naked'
            ? t('minisudoku.hintNaked', { v: h.value })
            : t('minisudoku.hintHidden', {
                unit: unitName(d.unit!.kind),
                n: d.unit!.index + 1,
                v: h.value,
              }),
      );
    }
    setSelected(h.cell);
    session.countHint();
    session.highlight(h.cell);
    commit(before, next);
  };

  const clear = () => {
    if (!givens) return;
    setNotice(null);
    commit(cellsRef.current, [...givens]);
  };

  const sel = selected;
  const selValue = sel !== null ? values[sel] : 0;
  const label = variant.difficulty === 'hard' ? '6×6 🔥' : '6×6';

  return (
    <PuzzleShell
      emoji="🧮"
      activityId="minisudoku"
      daily={daily}
      inSession={inSession}
      ready={!!givens && session.ready}
      elapsed={session.elapsed}
      solved={solved}
      hints={session.hints}
      label={label}
      variants={VARIANTS.map((v) => ({ id: v.id, label: t(`difficulty.${v.id}`) }))}
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
      rules={[t('minisudoku.rule1'), t('minisudoku.rule2'), t('minisudoku.rule3')]}
      controls={
        <div className="grid grid-cols-8 gap-1.5">
          {DIGITS.map((d) => (
            <button
              key={d}
              onClick={() => input(d)}
              disabled={!editable(sel)}
              className="rounded-xl bg-app-surface py-3 text-xl font-bold transition hover:bg-app-surface2 active:scale-95 disabled:opacity-40"
            >
              {d}
            </button>
          ))}
          <button
            onClick={erase}
            disabled={!editable(sel)}
            aria-label={t('minisudoku.erase')}
            className="rounded-xl bg-app-surface py-3 text-xl transition hover:bg-app-surface2 active:scale-95 disabled:opacity-40"
          >
            ⌫
          </button>
          <button
            onClick={() => setNotesMode((m) => !m)}
            aria-pressed={notesMode}
            aria-label={t('minisudoku.notes')}
            className={`rounded-xl py-3 text-xl transition active:scale-95 ${
              notesMode ? 'bg-brand text-white' : 'bg-app-surface hover:bg-app-surface2'
            }`}
          >
            ✏️
          </button>
        </div>
      }
    >
      {givens && (
        <div
          role="grid"
          aria-label={t('act.minisudoku.title')}
          className="grid h-full w-full select-none overflow-hidden rounded-xl border-[3px] border-slate-800 bg-slate-50"
          style={{
            gridTemplateColumns: `repeat(${N}, 1fr)`,
            gridTemplateRows: `repeat(${N}, 1fr)`,
          }}
        >
          {cells.map((cell, i) => {
            const r = rowOf(i);
            const c = colOf(i);
            const v = valueOf(cell);
            const fixed = givens[i] !== 0;
            const isSel = sel === i;
            const related =
              sel !== null &&
              (rowOf(sel) === r || colOf(sel) === c || boxOf(sel) === boxOf(i));
            const sameDigit = v !== 0 && v === selValue;
            const thick = '2px solid #1e293b';
            const thin = '1px solid rgba(15,23,42,0.18)';
            return (
              <button
                key={i}
                role="gridcell"
                aria-selected={isSel}
                aria-label={t('puzzle.cell', {
                  r: r + 1,
                  c: c + 1,
                  state: v
                    ? `${v}${fixed ? ` ${t('cell.given')}` : ''}`
                    : t('cell.empty'),
                })}
                onClick={() => setSelected(i)}
                className={`relative flex items-center justify-center outline-none ${
                  isSel
                    ? 'bg-indigo-200'
                    : sameDigit
                      ? 'bg-indigo-100'
                      : related
                        ? 'bg-slate-200/70'
                        : ''
                } ${session.flash === i ? 'animate-pulse' : ''}`}
                style={{
                  borderRight:
                    c < N - 1 ? ((c + 1) % BOX_COLS === 0 ? thick : thin) : undefined,
                  borderBottom:
                    r < N - 1 ? ((r + 1) % BOX_ROWS === 0 ? thick : thin) : undefined,
                }}
              >
                {v !== 0 ? (
                  <span
                    className={`text-[min(8vw,2.1rem)] ${
                      bad.has(i)
                        ? 'font-bold text-red-600'
                        : fixed
                          ? 'font-bold text-slate-900'
                          : 'font-semibold text-indigo-700'
                    }`}
                  >
                    {v}
                  </span>
                ) : (
                  notesOf(cell) !== 0 && (
                    <span
                      aria-hidden
                      className="grid h-full w-full grid-cols-3 p-0.5 text-[min(2.6vw,0.7rem)] leading-none text-slate-500"
                    >
                      {DIGITS.map((d) => (
                        <span key={d} className="flex items-center justify-center">
                          {notesOf(cell) & (1 << (d - 1)) ? d : ''}
                        </span>
                      ))}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      )}
    </PuzzleShell>
  );
}
