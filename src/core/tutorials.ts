import { create } from 'zustand';
import { storage } from './storage';

/** Qué tutoriales de primer uso ya se vieron (por id de actividad). */
interface TutorialState {
  seen: string[];
  loaded: boolean;
  /** Actividad cuyo tutorial se reabrió con «?» (o null). */
  helpFor: string | null;
  hydrate: () => Promise<void>;
  markSeen: (id: string) => void;
  openHelp: (id: string) => void;
}

const KEY = 'tutorials:seen';

export const useTutorials = create<TutorialState>((set, get) => ({
  seen: [],
  loaded: false,
  helpFor: null,
  hydrate: async () => {
    const saved = await storage.get<string[]>(KEY);
    set({ seen: saved ?? [], loaded: true });
  },
  markSeen: (id) => {
    set({ helpFor: null });
    if (get().seen.includes(id)) return;
    const seen = [...get().seen, id];
    set({ seen });
    void storage.set(KEY, seen);
  },
  openHelp: (id) => set({ helpFor: id }),
}));

/** ¿Está abierto el tutorial de `id`? (primera vez o reabierto con «?»). */
export function useTutorialOpen(id: string): boolean {
  return useTutorials((s) => s.loaded && (!s.seen.includes(id) || s.helpFor === id));
}
