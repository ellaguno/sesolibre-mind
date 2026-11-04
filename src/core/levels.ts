import { create } from 'zustand';
import { storage } from './storage';
import { findActivity, type ActivityMeta } from './registry';
import { useSettings } from './settings';

/**
 * Escalera de niveles. Cada actividad tiene niveles del más fácil al más
 * difícil (registry: `variants`). Todos se pueden elegir siempre; la app sólo
 * recuerda el nivel actual de cada actividad y, tras PASSES_TO_PROMOTE
 * resultados buenos en el nivel actual, propone subir al siguiente.
 *
 * La pregunta inicial («¿Cómo quieres empezar?») fija el nivel de partida de
 * todas las actividades: el más básico, el normal o el más difícil.
 */

export type StartChoice = 'basic' | 'normal' | 'challenge';
export const PASSES_TO_PROMOTE = 2;

export interface LevelsData {
  start: StartChoice | null;
  /** Nivel actual elegido por actividad (si no, el de partida). */
  current: Record<string, string>;
  /** Resultados buenos por `actividad:nivel`. */
  passes: Record<string, number>;
}

const KEY = 'levels:state';
const DEFAULTS: LevelsData = { start: null, current: {}, passes: {} };

// ---------- Lógica pura (testeable) ----------

export function startLevel(a: ActivityMeta, start: StartChoice | null): string {
  if (start === 'basic') return a.variants[0];
  if (start === 'challenge') return a.variants[a.variants.length - 1];
  return a.normal;
}

export function levelOf(data: LevelsData, a: ActivityMeta): string {
  const cur = data.current[a.id];
  return cur && a.variants.includes(cur) ? cur : startLevel(a, data.start);
}

/**
 * Registra un resultado. Devuelve los datos nuevos y, si toca, el nivel que se
 * propone a continuación (sólo al alcanzar justo PASSES_TO_PROMOTE en el nivel
 * actual y si hay uno más difícil).
 */
export function applyResult(
  data: LevelsData,
  a: ActivityMeta,
  level: string,
  passed: boolean,
): { data: LevelsData; suggest: string | null } {
  if (!passed || !a.variants.includes(level)) return { data, suggest: null };
  const k = `${a.id}:${level}`;
  const n = (data.passes[k] ?? 0) + 1;
  const next = { ...data, passes: { ...data.passes, [k]: n } };
  const idx = a.variants.indexOf(level);
  const isCurrent = levelOf(data, a) === level;
  const suggest =
    isCurrent && n === PASSES_TO_PROMOTE && idx < a.variants.length - 1
      ? a.variants[idx + 1]
      : null;
  return { data: next, suggest };
}

export function passesOf(data: LevelsData, activityId: string, level: string): number {
  return data.passes[`${activityId}:${level}`] ?? 0;
}

// ---------- Store ----------

interface LevelsState extends LevelsData {
  loaded: boolean;
  hydrate: () => Promise<void>;
  /** Respuesta a la pregunta inicial (o cambio en Ajustes): reinicia los niveles actuales. */
  choose: (start: StartChoice) => void;
  setLevel: (activityId: string, level: string) => void;
  /** Devuelve el nivel propuesto para subir, o null. */
  recordResult: (activityId: string, level: string, passed: boolean) => string | null;
}

const snapshot = (s: LevelsState): LevelsData => ({
  start: s.start,
  current: s.current,
  passes: s.passes,
});

export const useLevels = create<LevelsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  hydrate: async () => {
    const saved = await storage.get<LevelsData>(KEY);
    set({ ...DEFAULTS, ...saved, loaded: true });
  },

  choose: (start) => {
    // Quien empieza desde lo más básico arranca con el modo sereno (se puede quitar en Ajustes).
    if (start === 'basic' && get().start === null) useSettings.getState().setSerene(true);
    set({ start, current: {} });
    void persist(get);
  },

  setLevel: (activityId, level) => {
    set({ current: { ...get().current, [activityId]: level } });
    void persist(get);
  },

  recordResult: (activityId, level, passed) => {
    const a = findActivity(activityId);
    if (!a) return null;
    const { data, suggest } = applyResult(snapshot(get()), a, level, passed);
    set(data);
    void persist(get);
    return suggest;
  },
}));

async function persist(get: () => LevelsState) {
  if (!get().loaded) return;
  await storage.set<LevelsData>(KEY, snapshot(get()));
}

/**
 * Nivel actual de una actividad y su setter. En el reto diario el nivel lo fija
 * `fixed` (igual para todos) y no se puede cambiar.
 */
export function useActivityLevel(
  activityId: string,
  fixed?: string,
): [string, (level: string) => void] {
  const level = useLevels((s) => {
    const a = findActivity(activityId);
    return a ? levelOf(s, a) : '';
  });
  const setLevel = useLevels((s) => s.setLevel);
  return [fixed ?? level, (l: string) => setLevel(activityId, l)];
}
