import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioService } from '../../core/AudioService';

interface Options<T> {
  /** Identifica el tablero actual; al cambiar se reinicia la partida. null = cargando. */
  boardKey: string | null;
  initial: () => T[];
  isSolved: (cells: readonly T[]) => boolean;
  /** Se llama una vez al resolver, con los segundos empleados y las pistas usadas. */
  onSolved: (seconds: number, hints: number) => void;
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
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();

  // Tablero nuevo: reiniciar la partida.
  useEffect(() => {
    if (boardKey === null) return;
    const fresh = initial();
    cellsRef.current = fresh;
    setCellsState(fresh);
    setHistory([]);
    setElapsed(0);
    setHints(0);
    setSolved(false);
    setActiveKey(boardKey);
    startRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);

  const ready = boardKey !== null && activeKey === boardKey;

  // Cronómetro.
  useEffect(() => {
    if (!ready || solved) return;
    const id = setInterval(
      () => setElapsed(Math.floor((performance.now() - startRef.current) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [ready, solved]);

  // Victoria.
  useEffect(() => {
    if (!ready || solved || !isSolved(cells)) return;
    const secs = Math.max(1, Math.round((performance.now() - startRef.current) / 1000));
    setElapsed(secs);
    setSolved(true);
    AudioService.play('win');
    onSolved(secs, hints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cells, solved]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  /** Vista previa sin historial (durante un arrastre). */
  const preview = useCallback((next: T[]) => {
    cellsRef.current = next;
    setCellsState(next);
  }, []);

  /** Confirma un cambio desde `before` (entra en el historial de deshacer). */
  const commit = useCallback((before: T[], next: T[]) => {
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
  };
}
