import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioService } from '../../core/AudioService';
import { clearProgress, saveProgress, type SavedPuzzle } from '../../core/progress';

/** Guardado de la partida en curso (ver core/progress). */
export interface PersistOptions {
  activityId: string;
  daily: boolean;
  /** Semilla y nivel del tablero actual. */
  seed: number;
  level: string;
  /** Partida guardada a restaurar si corresponde a este mismo tablero. */
  restore: SavedPuzzle | null;
}

interface Options<T> {
  /** Identifica el tablero actual; al cambiar se reinicia la partida. null = cargando. */
  boardKey: string | null;
  initial: () => T[];
  isSolved: (cells: readonly T[]) => boolean;
  /** Se llama una vez al resolver, con los segundos empleados y las pistas usadas. */
  onSolved: (seconds: number, hints: number) => void;
  /** Detiene el cronómetro (p. ej. mientras se lee el tutorial). */
  paused?: boolean;
  persist?: PersistOptions;
  /**
   * Valida una partida guardada antes de retomarla. Por defecto se exige el
   * mismo largo que un tablero nuevo (una casilla por celda); los puzzles cuyo
   * estado crece (un trazo, palabras encontradas) dan su propia comprobación.
   */
  canRestore?: (cells: readonly T[], fresh: readonly T[]) => boolean;
}

/**
 * Estado común de una partida de puzzle: celdas, historial para deshacer,
 * cronómetro, pistas, celda resaltada y detección de victoria.
 *
 * `cellsRef` siempre tiene el estado más reciente: varios eventos de puntero
 * pueden llegar antes de que React vuelva a renderizar.
 */
export function usePuzzleSession<T>({
  boardKey,
  initial,
  isSolved,
  onSolved,
  paused = false,
  persist,
  canRestore = (cells, fresh) => cells.length === fresh.length,
}: Options<T>) {
  const [cells, setCellsState] = useState<T[]>([]);
  const [history, setHistory] = useState<T[][]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [hints, setHints] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const cellsRef = useRef<T[]>([]);
  const startRef = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  /** ¿Se retomó una partida guardada? (para avisar al jugador). */
  const [resumed, setResumed] = useState(false);
  /** Sólo se guarda un tablero tocado (o retomado), no uno recién generado. */
  const touched = useRef(false);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // Tablero nuevo: reiniciar la partida.
  useEffect(() => {
    if (boardKey === null) return;
    const fresh = initial();
    const r = persistRef.current?.restore;
    const p = persistRef.current;
    const restoring =
      !!r &&
      !!p &&
      r.seed === p.seed &&
      r.level === p.level &&
      canRestore(r.cells as T[], fresh);
    const start = restoring ? (r.cells as T[]) : fresh;
    cellsRef.current = start;
    setCellsState(start);
    setHistory([]);
    setElapsed(restoring ? r.elapsed : 0);
    setHints(restoring ? r.hints : 0);
    setSolved(false);
    setActiveKey(boardKey);
    setResumed(restoring);
    touched.current = restoring;
    startRef.current = performance.now() - (restoring ? r.elapsed * 1000 : 0);
    // Tablero nuevo durante una pausa: la pausa cuenta desde ahora.
    if (pausedAt.current !== null) pausedAt.current = startRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);

  const ready = boardKey !== null && activeKey === boardKey;

  // Pausa: al reanudar, correr el inicio lo que duró la pausa.
  useEffect(() => {
    if (paused) pausedAt.current = performance.now();
    else if (pausedAt.current !== null) {
      startRef.current += performance.now() - pausedAt.current;
      pausedAt.current = null;
    }
  }, [paused]);

  // Cronómetro.
  useEffect(() => {
    if (!ready || solved || paused) return;
    const id = setInterval(
      () => setElapsed(Math.floor((performance.now() - startRef.current) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [ready, solved, paused]);

  // Victoria.
  useEffect(() => {
    if (!ready || solved || !isSolved(cells)) return;
    const secs = Math.max(1, Math.round((performance.now() - startRef.current) / 1000));
    setElapsed(secs);
    setSolved(true);
    solvedRef.current = true;
    if (persistRef.current) {
      void clearProgress(persistRef.current.activityId, persistRef.current.daily);
    }
    AudioService.play('win');
    onSolved(secs, hints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cells, solved]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // Guardar la partida en curso (con un pequeño retraso y al salir).
  const elapsedNow = () => {
    const now = pausedAt.current ?? performance.now();
    return Math.floor((now - startRef.current) / 1000);
  };
  const saveNow = useCallback(() => {
    const p = persistRef.current;
    if (!p || !touched.current) return;
    void saveProgress(p.activityId, p.daily, {
      seed: p.seed,
      level: p.level,
      cells: cellsRef.current,
      elapsed: elapsedNow(),
      hints: hintsRef.current,
    });
  }, []);
  const hintsRef = useRef(hints);
  hintsRef.current = hints;
  useEffect(() => {
    if (!ready || solved || !touched.current) return;
    const id = setTimeout(saveNow, 400);
    return () => clearTimeout(id);
  }, [ready, solved, cells, hints, saveNow]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && !solvedRef.current) saveNow();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (!solvedRef.current) saveNow();
    };
  }, [saveNow]);
  const solvedRef = useRef(solved);
  solvedRef.current = solved;

  /** Vista previa sin historial (durante un arrastre). */
  const preview = useCallback((next: T[]) => {
    cellsRef.current = next;
    setCellsState(next);
  }, []);

  /** Confirma un cambio desde `before` (entra en el historial de deshacer). */
  const commit = useCallback((before: T[], next: T[]) => {
    touched.current = true;
    cellsRef.current = next;
    setCellsState(next);
    if (before.length === next.length && before.every((v, i) => v === next[i])) return;
    setHistory((h) => [...h, before].slice(-200));
  }, []);

  const undo = useCallback(() => {
    const prev = history[history.length - 1];
    if (!prev) return;
    cellsRef.current = prev;
    setCellsState(prev);
    setHistory(history.slice(0, -1));
  }, [history]);

  const highlight = useCallback((cell: number) => {
    setFlash(cell);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1200);
  }, []);

  const countHint = useCallback(() => setHints((n) => n + 1), []);

  return {
    ready,
    cells,
    cellsRef,
    preview,
    commit,
    undo,
    canUndo: history.length > 0,
    elapsed,
    hints,
    countHint,
    flash,
    highlight,
    solved,
    resumed,
  };
}
