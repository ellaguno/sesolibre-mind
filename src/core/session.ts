import { activities, type ActivityMeta } from './registry';
import { dailySeed, mulberry32, shuffle } from './rng';
import { storage } from './storage';

/**
 * Sesión diaria: 3 ejercicios de habilidades distintas + el puzzle del día.
 * Determinista por fecha (igual para todos) y con progreso guardado para
 * poder retomarla.
 */

export interface SessionPlan {
  day: string;
  /** Ids en orden: 3 ejercicios y al final el puzzle. */
  steps: string[];
}

export interface StepResult {
  id: string;
  score: number;
  meta?: Record<string, unknown>;
}

export interface SessionRecord {
  day: string;
  results: StepResult[];
}

export const EXERCISES_PER_SESSION = 3;

const available = (kind: ActivityMeta['kind']) =>
  activities.filter((a) => a.kind === kind && a.available);

/** Días desde 1970-01-01 para una clave YYYY-MM-DD (UTC, sin saltos por horario). */
function dayNumber(day: string): number {
  return Math.round(Date.parse(day + 'T00:00:00Z') / 86_400_000);
}

export function dailyPlan(day: string): SessionPlan {
  const rng = mulberry32(dailySeed(day, 'session'));
  const chosen: ActivityMeta[] = [];
  for (const a of shuffle(rng, available('exercise'))) {
    if (chosen.length === EXERCISES_PER_SESSION) break;
    if (!chosen.some((c) => c.domain === a.domain)) chosen.push(a);
  }
  // Si no hubiera suficientes habilidades distintas, completar con cualquiera.
  for (const a of shuffle(rng, available('exercise'))) {
    if (chosen.length === EXERCISES_PER_SESSION) break;
    if (!chosen.includes(a)) chosen.push(a);
  }
  const puzzles = available('puzzle');
  const puzzle = puzzles[dayNumber(day) % puzzles.length];
  return { day, steps: [...chosen.map((a) => a.id), ...(puzzle ? [puzzle.id] : [])] };
}

const key = (day: string) => `session:${day}`;

export async function loadSession(day: string): Promise<SessionRecord> {
  return (await storage.get<SessionRecord>(key(day))) ?? { day, results: [] };
}

export async function saveSession(rec: SessionRecord): Promise<void> {
  await storage.set(key(rec.day), rec);
}

export function isComplete(plan: SessionPlan, rec: SessionRecord): boolean {
  return plan.steps.every((id) => rec.results.some((r) => r.id === id));
}
