import { useEffect, useMemo, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { resolveLang, useT, type Lang } from '../../core/i18n';
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
import { crosswordSlides } from './tutorial';
import { VARIANTS, generateCrossword, type Variant } from './generator';
import { entryAt, hintCell, isSolved, numbers, wrongCells } from './logic';

const makeWorker = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const generateInline = (a: { seed: number; variant: Variant; lang: Lang }) =>
  generateCrossword(a.seed, a.variant, themesFor(a.lang));

const KEYS: Record<Lang, string[]> = {
  es: ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'],
  en: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'],
};
const SIZE_KEY: Record<string, string> = { '7': 's', '9': 'm', '11': 'l' };

export default function CrosswordGame({
  onScore,
  onExit,
  seed,
  daily,
  inSession,
  challenge,
}: GameProps) {
  const t = useT();
  const appLang = resolveLang(useSettings((s) => s.lang));
  const lang = challenge?.lang ?? appLang;
  const [variantId, setVariantId] = useActivityLevel(
    'crossword',
    daily || !!inSession,
    challenge?.level,
  );
  const variant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[1];
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const savedGame = useSavedPuzzle('crossword', daily);
  // Lo guardado lleva el idioma: no se retoma en otro idioma (sería otro tablero).
  const saveLevel = `${variant.id}:${lang}`;
  const resumeSeed =
    !challenge && round === 0 && savedGame.saved?.level === saveLevel
      ? savedGame.saved.seed
      : null;
  const bseed = resumeSeed ?? boardSeed(seed, daily || !!challenge, round, variant.id);
  const key = `${bseed}:${variant.id}:${lang}`;
  const puzzle = useWorkerResult(
    key,
    makeWorker,
    { seed: bseed, variant, lang },
    generateInline,
  );
  const nums = useMemo(
    () => (puzzle ? numbers(puzzle) : new Map<number, number>()),
    [puzzle],
  );

  const tutorialOpen = useTutorialOpen('crossword');
  const session = usePuzzleSession<string>({
    boardKey: puzzle ? key : null,
    initial: () => (puzzle ? puzzle.solution.map(() => '') : []),
    isSolved: (cells) => !!puzzle && isSolved(puzzle, cells),
    paused: tutorialOpen,
    persist: challenge
      ? undefined
      : {
          activityId: 'crossword',
          daily,
          seed: bseed,
          level: saveLevel,
          restore: resumeSeed !== null ? savedGame.saved : null,
        },
    onSolved: (secs, hints) => onScore(secs, { difficulty: variant.id, hints }),
  });
  const { cells, cellsRef, commit, solved } = session;

  // Casilla y dirección elegidas (empieza en la 1.ª horizontal).
  const [sel, setSel] = useState<{ cell: number; dir: 'a' | 'd' } | null>(null);
  useEffect(() => {
    if (puzzle) setSel({ cell: puzzle.entries[0].cells[0], dir: puzzle.entries[0].dir });
  }, [puzzle]);
  const entryIdx = puzzle && sel ? entryAt(puzzle, sel.cell, sel.dir) : -1;
  const entry = puzzle && entryIdx >= 0 ? puzzle.entries[entryIdx] : null;
  const inEntry = useMemo(() => new Set(entry?.cells ?? []), [entry]);

  // Al llenar todo sin acertar se marcan en rojo las letras que no encajan.
  const full = !!puzzle && puzzle.solution.every((l, i) => l === '' || cells[i]);
  const wrong = useMemo(
    () => new Set(puzzle && full && !solved ? wrongCells(puzzle, cells) : []),
    [puzzle, full, solved, cells],
  );
  useEffect(() => {
    if (wrong.size) setNotice(t('crossword.wrong'));
  }, [wrong.size, t]);

  const goEntry = (k: number) => {
    if (!puzzle) return;
    const e = puzzle.entries[(k + puzzle.entries.length) % puzzle.entries.length];
    const firstEmpty = e.cells.find((c) => !cellsRef.current[c]) ?? e.cells[0];
    setSel({ cell: firstEmpty, dir: e.dir });
  };

  const tapCell = (i: number) => {
    if (!puzzle || solved || !puzzle.solution[i]) return;
    if (sel?.cell === i) {
      // Segundo toque: cambia de dirección si allí cruza otra palabra.
      const other = sel.dir === 'a' ? 'd' : 'a';
      const k = puzzle.entries.findIndex((e) => e.dir === other && e.cells.includes(i));
      if (k >= 0) setSel({ cell: i, dir: other });
    } else {
      setSel({ cell: i, dir: sel?.dir ?? 'a' });
    }
  };

  const type = (letter: string) => {
    if (!puzzle || !sel || !entry || solved) return;
    const before = cellsRef.current;
    const next = [...before];
    next[sel.cell] = letter;
    commit(before, next);
    AudioService.play('pop');
    setNotice(null);
    const at = entry.cells.indexOf(sel.cell);
    if (at < entry.cells.length - 1)
      setSel({ cell: entry.cells[at + 1], dir: entry.dir });
  };

  const erase = () => {
    if (!puzzle || !sel || !entry || solved) return;
    const before = cellsRef.current;
    const at = entry.cells.indexOf(sel.cell);
    // Casilla vacía: se borra la anterior y se retrocede.
    const target = before[sel.cell] || at === 0 ? sel.cell : entry.cells[at - 1];
    if (before[target]) {
      const next = [...before];
      next[target] = '';
      commit(before, next);
    }
    setSel({ cell: target, dir: entry.dir });
    setNotice(null);
  };

  // Teclado físico (escritorio / Chromebook).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (KEYS[lang].some((row) => row.includes(k)) && k.length === 1) {
        e.preventDefault();
        type(k);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        erase();
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        goEntry(entryIdx + (e.shiftKey ? -1 : 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const applyHint = () => {
    if (!puzzle || solved) return;
    const before = cellsRef.current;
    const c = hintCell(puzzle, before, Math.max(0, entryIdx));
    if (c === null) return;
    const next = [...before];
    next[c] = puzzle.solution[c];
    session.countHint();
    session.highlight(c);
    commit(before, next);
    setNotice(t('crossword.hintNote'));
  };

  const sizeLabel = (id: string) =>
    `${t(`crossword.size.${SIZE_KEY[id]}`)}${VARIANTS.find((v) => v.id === id)?.hard ? ' 🔥' : ''}`;

  const controls = puzzle && (
    <div className="flex flex-col gap-1.5">
      {entry && (
        <div className="flex items-center gap-1 rounded-xl bg-brand/15 px-1 py-1">
          <button
            onClick={() => goEntry(entryIdx - 1)}
            aria-label={t('crossword.prev')}
            className="rounded-lg px-2 py-1 text-lg hover:bg-brand/20"
          >
            ‹
          </button>
          <p
            className="min-w-0 flex-1 text-center text-sm leading-tight"
            aria-live="polite"
          >
            <span className="font-bold">
              {entry.num} {t(entry.dir === 'a' ? 'crossword.across' : 'crossword.down')}:
            </span>{' '}
            {entry.clue}
          </p>
          <button
            onClick={() => goEntry(entryIdx + 1)}
            aria-label={t('crossword.next')}
            className="rounded-lg px-2 py-1 text-lg hover:bg-brand/20"
          >
            ›
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1" aria-label={t('crossword.keyboard')}>
        {KEYS[lang].map((row, r) => (
          <div key={row} className="flex justify-center gap-1">
            {[...row].map((k) => (
              <button
                key={k}
                onClick={() => type(k)}
                disabled={solved}
                className="h-10 min-w-0 flex-1 rounded-md bg-app-surface2 text-base font-semibold hover:bg-app-border disabled:opacity-40"
              >
                {k}
              </button>
            ))}
            {r === KEYS[lang].length - 1 && (
              <button
                onClick={erase}
                disabled={solved}
                aria-label={t('crossword.erase')}
                className="h-10 flex-[1.6] rounded-md bg-app-surface2 text-base hover:bg-app-border disabled:opacity-40"
              >
                ⌫
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <PuzzleShell
      emoji="📝"
      activityId="crossword"
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
      label={sizeLabel(variant.id)}
      variants={VARIANTS.map((v) => ({ id: v.id, label: sizeLabel(v.id) }))}
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
        commit(
          cellsRef.current,
          puzzle.solution.map(() => ''),
        );
      }}
      onHint={applyHint}
      notice={notice}
      slides={crosswordSlides(t, lang)}
      rules={[t('crossword.rule1'), t('crossword.rule2'), t('crossword.rule3')]}
      header={
        puzzle && (
          <p className="text-center text-sm">
            <span className="text-app-muted">{t('wordmaze.theme')}: </span>
            <span className="font-bold">{puzzle.theme}</span>
          </p>
        )
      }
      controls={controls}
    >
      {puzzle && (
        <div className="flex h-full w-full items-center justify-center">
          <div
            role="grid"
            aria-label={t('act.crossword.title')}
            className="grid select-none"
            style={{
              gridTemplateColumns: `repeat(${puzzle.cols}, 1fr)`,
              gridTemplateRows: `repeat(${puzzle.rows}, 1fr)`,
              aspectRatio: `${puzzle.cols} / ${puzzle.rows}`,
              width: puzzle.cols >= puzzle.rows ? '100%' : 'auto',
              height: puzzle.rows > puzzle.cols ? '100%' : 'auto',
              containerType: 'size',
            }}
          >
            {puzzle.solution.map((l, i) => {
              if (!l) return <div key={i} aria-hidden />;
              const n = nums.get(i);
              const selected = sel?.cell === i;
              return (
                <button
                  key={i}
                  role="gridcell"
                  onClick={() => tapCell(i)}
                  aria-label={t('puzzle.cell', {
                    r: Math.floor(i / puzzle.cols) + 1,
                    c: (i % puzzle.cols) + 1,
                    state: cells[i] || t('cell.empty'),
                  })}
                  className={`relative m-[1px] flex items-center justify-center rounded-[3px] font-bold uppercase ${
                    selected
                      ? 'bg-amber-300 text-slate-900'
                      : inEntry.has(i)
                        ? 'bg-indigo-200 text-slate-900'
                        : 'bg-slate-50 text-slate-900'
                  } ${wrong.has(i) ? '!text-red-600' : ''} ${
                    session.flash === i ? 'animate-pulse' : ''
                  }`}
                  style={{ fontSize: `${62 / Math.max(puzzle.cols, puzzle.rows)}cqmin` }}
                >
                  {n && (
                    <span
                      className="absolute left-[3%] top-0 font-semibold text-slate-500"
                      style={{ fontSize: '0.4em' }}
                    >
                      {n}
                    </span>
                  )}
                  {cells[i]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PuzzleShell>
  );
}
