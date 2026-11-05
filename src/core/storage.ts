import { Capacitor } from '@capacitor/core';

/**
 * Capa de persistencia con una sola interfaz y dos implementaciones:
 *  - Nativo (Capacitor): @capacitor/preferences
 *  - Web: localStorage (con fallback a memoria si no está disponible)
 *
 * Todas las claves se serializan como JSON.
 */
export interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  /** Todas las claves guardadas (sin prefijo de perfil en el almacén crudo). */
  keys(): Promise<string[]>;
}

/** JSON corrupto => null (como si no existiera) en vez de romper la
 *  hidratación de los stores, que dejaría la app con los valores por defecto. */
function parse<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

class WebStorage implements Storage {
  private memory = new Map<string, string>();

  private get backend(): Pick<typeof localStorage, 'getItem' | 'setItem' | 'removeItem'> {
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch {
      /* localStorage bloqueado (modo privado, sandbox): usar memoria */
    }
    return {
      getItem: (k: string) => this.memory.get(k) ?? null,
      setItem: (k: string, v: string) => void this.memory.set(k, v),
      removeItem: (k: string) => void this.memory.delete(k),
    };
  }

  async get<T>(key: string): Promise<T | null> {
    return parse<T>(this.backend.getItem(key));
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.backend.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.backend.removeItem(key);
  }

  async keys(): Promise<string[]> {
    try {
      if (typeof localStorage !== 'undefined') return Object.keys(localStorage);
    } catch {
      /* localStorage bloqueado */
    }
    return [...this.memory.keys()];
  }
}

class NativeStorage implements Storage {
  async get<T>(key: string): Promise<T | null> {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return parse<T>(value);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value: JSON.stringify(value) });
  }

  async remove(key: string): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  }

  async keys(): Promise<string[]> {
    const { Preferences } = await import('@capacitor/preferences');
    return (await Preferences.keys()).keys;
  }
}

/** Almacén sin prefijo: datos globales del dispositivo (lista de perfiles). */
export const rawStorage: Storage = Capacitor.isNativePlatform()
  ? new NativeStorage()
  : new WebStorage();

/**
 * Modo familia: cada perfil guarda sus datos con un prefijo `p:<id>:`. El
 * perfil principal no usa prefijo, así que conserva los datos de siempre.
 */
let namespace = '';
export function setStorageNamespace(prefix: string): void {
  namespace = prefix;
}
export const profilePrefix = (profileId: string) =>
  profileId === 'main' ? '' : `p:${profileId}:`;

/** Almacén del perfil activo (el que usan todos los servicios). */
export const storage: Storage = {
  get: (key) => rawStorage.get(namespace + key),
  set: (key, value) => rawStorage.set(namespace + key, value),
  remove: (key) => rawStorage.remove(namespace + key),
  keys: async () =>
    (await rawStorage.keys())
      .filter((k) => k.startsWith(namespace) && (namespace || !k.startsWith('p:')))
      .map((k) => k.slice(namespace.length)),
};
