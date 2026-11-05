import { create } from 'zustand';
import { profilePrefix, rawStorage, setStorageNamespace } from './storage';

/**
 * Modo familia: varios perfiles en el mismo dispositivo, cada uno con sus
 * niveles, racha, récords, ajustes y partidas. La lista y el perfil activo son
 * globales (sin prefijo); todo lo demás va en el espacio de cada perfil.
 */

export interface Profile {
  id: string;
  name: string;
  emoji: string;
}

export const AVATARS = [
  '🦉',
  '🦊',
  '🐢',
  '🐝',
  '🌻',
  '🐬',
  '🦁',
  '🐼',
  '🌵',
  '🍀',
  '⭐',
  '🎈',
];
export const MAX_PROFILES = 8;

const LIST = 'profiles:list';
const ACTIVE = 'profiles:active';
const MAIN: Profile = { id: 'main', name: '', emoji: '🧠' };

interface ProfilesState {
  list: Profile[];
  activeId: string;
  ready: boolean;
  /** Carga la lista y fija el espacio de almacenamiento del perfil activo. */
  init: () => Promise<void>;
  add: (name: string, emoji: string) => Promise<Profile>;
  update: (id: string, changes: Partial<Omit<Profile, 'id'>>) => Promise<void>;
  /** Borra el perfil y todos sus datos (no se puede borrar el principal). */
  remove: (id: string) => Promise<void>;
  /** Cambia de perfil y recarga la app para que todo se lea del nuevo espacio. */
  switchTo: (id: string) => Promise<void>;
}

export const useProfiles = create<ProfilesState>((set, get) => ({
  list: [MAIN],
  activeId: 'main',
  ready: false,

  init: async () => {
    const list = (await rawStorage.get<Profile[]>(LIST)) ?? [MAIN];
    const saved = (await rawStorage.get<string>(ACTIVE)) ?? 'main';
    const activeId = list.some((p) => p.id === saved) ? saved : 'main';
    setStorageNamespace(profilePrefix(activeId));
    set({ list, activeId, ready: true });
  },

  add: async (name, emoji) => {
    const id = Math.random().toString(36).slice(2, 8);
    const profile = { id, name: name.trim().slice(0, 20), emoji };
    const list = [...get().list, profile];
    await rawStorage.set(LIST, list);
    set({ list });
    return profile;
  },

  update: async (id, changes) => {
    const list = get().list.map((p) =>
      p.id === id
        ? { ...p, ...changes, name: (changes.name ?? p.name).trim().slice(0, 20) }
        : p,
    );
    await rawStorage.set(LIST, list);
    set({ list });
  },

  remove: async (id) => {
    if (id === 'main') return;
    const prefix = profilePrefix(id);
    for (const k of await rawStorage.keys())
      if (k.startsWith(prefix)) await rawStorage.remove(k);
    const list = get().list.filter((p) => p.id !== id);
    await rawStorage.set(LIST, list);
    set({ list });
    if (get().activeId === id) await get().switchTo('main');
  },

  switchTo: async (id) => {
    await rawStorage.set(ACTIVE, id);
    if (typeof window !== 'undefined') window.location.reload();
  },
}));

/** Perfil activo (el principal, si la lista aún no cargó). */
export function useActiveProfile(): Profile {
  return useProfiles((s) => s.list.find((p) => p.id === s.activeId) ?? MAIN);
}
