import type { ComponentType } from 'react';

export type ScoreKind = 'points' | 'time' | 'moves';

/** Tipo de actividad: ejercicio cognitivo cronometrado o puzzle de lógica. */
export type ActivityKind = 'exercise' | 'puzzle';

/**
 * Habilidad que trabaja principalmente cada actividad. Alimenta el perfil por
 * habilidad (gráfica de radar). Textos en i18n: `domain.<id>`.
 */
export const DOMAINS = [
  'speed',
  'memory',
  'attention',
  'flexibility',
  'logic',
  'language',
] as const;
export type Domain = (typeof DOMAINS)[number];

export interface GameProps {
  onScore: (score: number, meta?: Record<string, unknown>) => void;
  onExit: () => void;
  /** Semilla del generador: misma semilla => mismo contenido (ver core/rng). */
  seed: number;
  /** true si es el reto del día (semilla compartida por todos ese día). */
  daily: boolean;
  difficulty?: string;
}

export interface ActivityMeta {
  id: string;
  kind: ActivityKind;
  domain: Domain;
  emoji: string;
  scoreKind: ScoreKind;
  higherIsBetter: boolean;
  available: boolean;
  accent: string; // color de acento en hex
  load?: () => Promise<{ default: ComponentType<GameProps> }>;
  /**
   * Variantes con récord propio (p. ej. tamaños de tablero), de la más fácil a
   * la más difícil. La actividad las indica en onScore(score, { difficulty }).
   */
  variants?: readonly string[];
}

/** Clave de récords de una actividad (y de su variante, si la tiene). */
export function scoreKey(id: string, variant?: string | null): string {
  return variant ? `${id}:${variant}` : id;
}

export function variantFromMeta(
  activity: ActivityMeta,
  meta?: Record<string, unknown>,
): string | null {
  const v = meta?.difficulty;
  return typeof v === 'string' && activity.variants?.includes(v) ? v : null;
}

/**
 * Registro central. El hub se construye a partir de esta lista. Título y
 * descripción viven en i18n (claves `act.<id>.title` / `act.<id>.desc`).
 * Las marcadas `available: false` aún no están implementadas (ver docs/PLAN.md).
 */
export const activities: ActivityMeta[] = [
  // ---------- Ejercicios (Bloque B) ----------
  {
    id: 'quickmath',
    kind: 'exercise',
    domain: 'speed',
    emoji: '➗',
    scoreKind: 'time',
    higherIsBetter: false,
    available: false,
    accent: '#f97316',
  },
  {
    id: 'colorclash',
    kind: 'exercise',
    domain: 'attention',
    emoji: '🎨',
    scoreKind: 'time',
    higherIsBetter: false,
    available: false,
    accent: '#ec4899',
  },
  {
    id: 'countdown',
    kind: 'exercise',
    domain: 'memory',
    emoji: '➖',
    scoreKind: 'points',
    higherIsBetter: true,
    available: false,
    accent: '#a855f7',
  },
  {
    id: 'numberspan',
    kind: 'exercise',
    domain: 'memory',
    emoji: '🔢',
    scoreKind: 'points',
    higherIsBetter: true,
    available: false,
    accent: '#8b5cf6',
  },
  {
    id: 'trails',
    kind: 'exercise',
    domain: 'flexibility',
    emoji: '🔗',
    scoreKind: 'time',
    higherIsBetter: false,
    available: false,
    accent: '#14b8a6',
  },
  {
    id: 'headcount',
    kind: 'exercise',
    domain: 'attention',
    emoji: '🏠',
    scoreKind: 'points',
    higherIsBetter: true,
    available: false,
    accent: '#eab308',
  },

  // ---------- Puzzles de lógica (Bloque A) ----------
  {
    id: 'crowns',
    kind: 'puzzle',
    domain: 'logic',
    emoji: '👑',
    scoreKind: 'time',
    higherIsBetter: false,
    available: true,
    accent: '#a78bfa',
    // Lado del tablero; deben coincidir con SIZES (puzzles/crowns/CrownsGame.tsx).
    variants: ['6', '7', '8', '9'],
    load: () => import('../puzzles/crowns/CrownsGame'),
  },
  {
    id: 'sunmoon',
    kind: 'puzzle',
    domain: 'logic',
    emoji: '🌓',
    scoreKind: 'time',
    higherIsBetter: false,
    available: true,
    accent: '#f59e0b',
    // Deben coincidir con VARIANTS (puzzles/sunmoon/generator.ts).
    variants: ['6', '6h', '8'],
    load: () => import('../puzzles/sunmoon/SunMoonGame'),
  },
  {
    id: 'thread',
    kind: 'puzzle',
    domain: 'logic',
    emoji: '🧵',
    scoreKind: 'time',
    higherIsBetter: false,
    available: true,
    accent: '#22c55e',
    // Deben coincidir con VARIANTS (puzzles/thread/generator.ts).
    variants: ['6', '7', '8'],
    load: () => import('../puzzles/thread/ThreadGame'),
  },
  {
    id: 'plots',
    kind: 'puzzle',
    domain: 'logic',
    emoji: '🟩',
    scoreKind: 'time',
    higherIsBetter: false,
    available: true,
    accent: '#06b6d4',
    // Deben coincidir con VARIANTS (puzzles/plots/generator.ts).
    variants: ['6', '7', '8'],
    load: () => import('../puzzles/plots/PlotsGame'),
  },
  {
    id: 'minisudoku',
    kind: 'puzzle',
    domain: 'logic',
    emoji: '🧮',
    scoreKind: 'time',
    higherIsBetter: false,
    available: true,
    accent: '#3b82f6',
    // Deben coincidir con VARIANTS (puzzles/minisudoku/generator.ts).
    variants: ['easy', 'hard'],
    load: () => import('../puzzles/minisudoku/MiniSudokuGame'),
  },
];

export function findActivity(id: string | undefined): ActivityMeta | undefined {
  return activities.find((a) => a.id === id);
}
