import { dateKey } from './rng';

/**
 * Comparación anónima en línea (servicio en server/score, publicado en
 * games.sesolibre.com/score). Es opcional y está apagada por defecto: sin red o si
 * el servicio no responde, la app sigue igual y no se muestra nada.
 *
 * Solo se envía la actividad, el nivel, el idioma del tablero (en juegos de
 * palabras), el día y el resultado; al publicar, además, 3 iniciales.
 */
export const SCORE_API: string =
  import.meta.env.VITE_SCORE_API ?? 'https://games.sesolibre.com/score/api.php';

const APP = 'mind';
const TIMEOUT_MS = 6000;

export interface Board {
  activityId: string;
  level: string;
  /** Solo en juegos de palabras (el tablero depende del idioma). */
  lang?: 'es' | 'en';
  /** Puzzle o ejercicio del día: se compara con quienes jugaron el mismo hoy. */
  daily: boolean;
}

export interface Standing {
  total: number;
  /** Porcentaje de resultados publicados que son peores (null si no hay). */
  pct: number | null;
}

function query(b: Board): Record<string, string> {
  return {
    app: APP,
    act: b.activityId,
    lvl: b.level,
    lang: b.lang ?? '',
    scope: b.daily ? 'day' : 'all',
    day: b.daily ? dateKey(new Date()) : '',
  };
}

async function call<T>(
  params: Record<string, string>,
  body?: unknown,
): Promise<T | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SCORE_API}?${new URLSearchParams(params)}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) return { error: data.error ?? String(res.status) } as T;
    return data;
  } catch {
    return null; // sin red, tiempo agotado o servicio caído
  } finally {
    clearTimeout(timer);
  }
}

/** Resultados enteros: segundos o puntos. */
const asInt = (score: number) => Math.max(0, Math.round(score));

/** ¿Mejor que qué % de lo publicado? No guarda nada en el servidor. */
export function fetchStanding(b: Board, score: number) {
  return call<Standing>({ a: 'pct', ...query(b), score: String(asInt(score)) });
}

/** Publica el resultado con 3 iniciales. */
export function publishScore(b: Board, initials: string, score: number) {
  const { scope, ...q } = query(b);
  return call<(Standing & { ok: true; rank: number }) | { error: string }>(
    { a: 'submit' },
    { ...q, daily: scope === 'day', ini: initials, score: asInt(score) },
  );
}

export interface TopRow {
  ini: string;
  score: number;
}

/** Mejores resultados publicados de un tablero. */
export async function fetchTop(b: Board, limit = 10): Promise<TopRow[] | null> {
  const r = await call<{ rows: TopRow[] }>({
    a: 'top',
    ...query(b),
    limit: String(limit),
  });
  return r && 'rows' in r ? r.rows : null;
}

/** Iniciales válidas: 3 letras A–Z. */
export const validInitials = (s: string) => /^[A-Z]{3}$/.test(s);
