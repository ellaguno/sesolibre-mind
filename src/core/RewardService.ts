import { create } from 'zustand';
import { storage } from './storage';
import { activities } from './registry';
import { dateKey } from './rng';

/**
 * Constancia y logros. La racha cuenta días en que se completó al menos una
 * actividad (idealmente la sesión diaria). Todo local y determinista (reloj del
 * dispositivo; sin servidor que valide).
 */

export interface RewardData {
  lastActiveDay: string | null; // YYYY-MM-DD del último día con actividad
  streak: number;
  bestStreak: number;
  activeDays: string[]; // calendario de constancia (más recientes al final, acotado)
  achievements: string[]; // ids desbloqueados
}

const KEY = 'rewards:state';
const MAX_DAYS = 400;
const DEFAULTS: RewardData = {
  lastActiveDay: null,
  streak: 0,
  bestStreak: 0,
  activeDays: [],
  achievements: [],
};

export interface Achievement {
  id: string;
  activityId?: string; // si es un logro "probaste <actividad>"
}

// Un logro por actividad + hitos de racha. El texto se traduce en i18n.
export const STREAK_MILESTONES = [3, 7, 30, 100] as const;
export const ACHIEVEMENTS: Achievement[] = [
  ...activities.map((a) => ({ id: `play_${a.id}`, activityId: a.id })),
  { id: 'all_activities' },
  ...STREAK_MILESTONES.map((n) => ({ id: `streak_${n}` })),
];

// ---------- Lógica pura (testeable) ----------

/** ¿`today` es el día siguiente a `prev`? Se compara en UTC para que los
 *  cambios de horario (días de 23 o 25 h) no rompan la racha. */
export function isConsecutive(prev: string, today: string): boolean {
  return (
    (Date.parse(today + 'T00:00:00Z') - Date.parse(prev + 'T00:00:00Z')) / 86_400_000 ===
    1
  );
}

/** Registra actividad en `today`. Idempotente dentro del mismo día. */
export function applyActiveDay(data: RewardData, today: string): RewardData {
  if (data.lastActiveDay === today) return data;
  const streak =
    data.lastActiveDay && isConsecutive(data.lastActiveDay, today) ? data.streak + 1 : 1;
  const achievements = [...data.achievements];
  for (const n of STREAK_MILESTONES) {
    const id = `streak_${n}`;
    if (streak >= n && !achievements.includes(id)) achievements.push(id);
  }
  return {
    ...data,
    lastActiveDay: today,
    streak,
    bestStreak: Math.max(data.bestStreak, streak),
    activeDays: [...data.activeDays, today].slice(-MAX_DAYS),
    achievements,
  };
}

/** Racha vigente a fecha `today`: si ayer no hubo actividad, ya se rompió. */
export function currentStreak(data: RewardData, today: string): number {
  if (!data.lastActiveDay) return 0;
  if (data.lastActiveDay === today || isConsecutive(data.lastActiveDay, today)) {
    return data.streak;
  }
  return 0;
}

// ---------- Store ----------

interface RewardState extends RewardData {
  loaded: boolean;
  hydrate: () => Promise<void>;
  unlock: (id: string) => boolean; // true si era nuevo
  /** Llamar al terminar cualquier actividad. */
  recordPlay: (activityId: string) => void;
}

export const useRewards = create<RewardState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  hydrate: async () => {
    const saved = await storage.get<RewardData>(KEY);
    set({ ...DEFAULTS, ...saved, loaded: true });
  },

  unlock: (id) => {
    if (get().achievements.includes(id)) return false;
    set({ achievements: [...get().achievements, id] });
    void persist(get);
    return true;
  },

  recordPlay: (activityId) => {
    set(applyActiveDay(snapshot(get()), dateKey(new Date())));
    get().unlock(`play_${activityId}`);
    const all = activities.every((a) => get().achievements.includes(`play_${a.id}`));
    if (all) get().unlock('all_activities');
    void persist(get);
  },
}));

function snapshot(s: RewardState): RewardData {
  return {
    lastActiveDay: s.lastActiveDay,
    streak: s.streak,
    bestStreak: s.bestStreak,
    activeDays: s.activeDays,
    achievements: s.achievements,
  };
}

async function persist(get: () => RewardState) {
  // Antes de hidratar el store tiene los valores por defecto: escribirlos
  // borraría el progreso guardado.
  if (!get().loaded) return;
  await storage.set<RewardData>(KEY, snapshot(get()));
}
