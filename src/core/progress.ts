import { useEffect, useState } from 'react';
import { storage } from './storage';
import { dateKey } from './rng';

/**
 * Partida de puzzle en curso, para retomarla al volver. Hay una por actividad
 * y modo: práctica libre y reto del día (éste sólo vale el mismo día y lo
 * comparten el reto del hub y la sesión diaria, que usan la misma semilla).
 */
export interface SavedPuzzle {
  /** Semilla del tablero y nivel: con ellos se regenera el mismo tablero. */
  seed: number;
  level: string;
  /** Día del reto (sólo en modo diario). */
  day: string | null;
  cells: unknown[];
  elapsed: number;
  hints: number;
}

const key = (activityId: string, daily: boolean) =>
  `progress:${activityId}:${daily ? 'daily' : 'free'}`;

export async function loadProgress(
  activityId: string,
  daily: boolean,
): Promise<SavedPuzzle | null> {
  const saved = await storage.get<SavedPuzzle>(key(activityId, daily));
  if (!saved) return null;
  // El reto de ayer ya no se puede retomar.
  if (daily && saved.day !== dateKey(new Date())) return null;
  return saved;
}

export async function saveProgress(
  activityId: string,
  daily: boolean,
  data: Omit<SavedPuzzle, 'day'>,
): Promise<void> {
  await storage.set<SavedPuzzle>(key(activityId, daily), {
    ...data,
    day: daily ? dateKey(new Date()) : null,
  });
}

export async function clearProgress(activityId: string, daily: boolean): Promise<void> {
  await storage.remove(key(activityId, daily));
}

/** ¿Hay alguna partida en curso de la actividad? (para el hub). */
export async function hasProgress(activityId: string): Promise<boolean> {
  return (
    (await loadProgress(activityId, false)) !== null ||
    (await loadProgress(activityId, true)) !== null
  );
}

/** Carga (una vez) la partida guardada de la actividad en ese modo. */
export function useSavedPuzzle(activityId: string, daily: boolean) {
  const [state, setState] = useState<{ ready: boolean; saved: SavedPuzzle | null }>({
    ready: false,
    saved: null,
  });
  useEffect(() => {
    let alive = true;
    void loadProgress(activityId, daily).then((saved) => {
      if (alive) setState({ ready: true, saved });
    });
    return () => {
      alive = false;
    };
  }, [activityId, daily]);
  return state;
}
