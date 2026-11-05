import { create } from 'zustand';
import { storage } from './storage';

export type Theme = 'light' | 'dark';
export type LangSetting = 'auto' | 'es' | 'en';

export interface Settings {
  theme: Theme;
  sound: boolean;
  motion: boolean;
  lang: LangSetting;
  /** Modo daltónico: texturas además de color y paletas seguras para daltonismo. */
  colorblind: boolean;
  /**
   * Modo sereno: sin cronómetro ni penalizaciones, interfaz más grande y lenta,
   * pistas gratis, ayudas al jugar, ánimo en vez de Índice y racha que perdona.
   */
  serene: boolean;
  /** Recordatorio diario (app nativa) y su hora HH:MM. */
  reminder: boolean;
  reminderTime: string;
}

const KEY = 'settings';
const DEFAULTS: Settings = {
  theme: 'dark',
  sound: true,
  motion: true,
  lang: 'auto',
  colorblind: false,
  serene: false,
  reminder: false,
  reminderTime: '19:00',
};

interface SettingsState extends Settings {
  loaded: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSound: (sound: boolean) => void;
  setMotion: (motion: boolean) => void;
  setLang: (lang: LangSetting) => void;
  setColorblind: (on: boolean) => void;
  setSerene: (on: boolean) => void;
  setReminder: (on: boolean, time?: string) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  // Barra de estado / UI de la PWA acorde al tema (= --c-bg de index.css).
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0f172a' : '#eef2f7');
}

/** Modo sereno: toda la interfaz (en rem) un ~13 % más grande que la base (17 px). */
function applyScale(serene: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.fontSize = serene ? '106.25%' : '';
}

/** Factor de lentitud de animaciones y tiempos de exposición en modo sereno. */
export const SERENE_SLOWDOWN = 1.5;

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  hydrate: async () => {
    const saved = await storage.get<Settings>(KEY);
    const merged = { ...DEFAULTS, ...saved };
    applyTheme(merged.theme);
    applyScale(merged.serene);
    set({ ...merged, loaded: true });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
    void persist(get);
  },

  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    set({ theme });
    void persist(get);
  },

  setSound: (sound) => {
    set({ sound });
    void persist(get);
  },

  setMotion: (motion) => {
    set({ motion });
    void persist(get);
  },

  setLang: (lang) => {
    set({ lang });
    void persist(get);
  },

  setColorblind: (colorblind) => {
    set({ colorblind });
    void persist(get);
  },

  setReminder: (reminder, time) => {
    set(time ? { reminder, reminderTime: time } : { reminder });
    void persist(get);
  },

  setSerene: (serene) => {
    applyScale(serene);
    set({ serene });
    void persist(get);
  },
}));

async function persist(get: () => SettingsState) {
  const { theme, sound, motion, lang, colorblind, serene, reminder, reminderTime } =
    get();
  await storage.set<Settings>(KEY, {
    theme,
    sound,
    motion,
    lang,
    colorblind,
    serene,
    reminder,
    reminderTime,
  });
}

/** ¿Deben reproducirse animaciones? Respeta el ajuste y prefers-reduced-motion. */
export function animationsEnabled(): boolean {
  if (!useSettings.getState().motion) return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return true;
}
