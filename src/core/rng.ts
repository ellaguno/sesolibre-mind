/**
 * Aleatoriedad determinista. Los generadores de puzzles y ejercicios reciben
 * siempre un `Rng` (nunca usan Math.random), de modo que la misma semilla da el
 * mismo contenido: así funciona el reto diario igual para todos sin servidor, y
 * los tests son reproducibles.
 */

export type Rng = () => number; // [0, 1)

/** PRNG mulberry32: rápido, 32 bits, suficiente para juegos. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a de 32 bits de un texto (para derivar semillas de cadenas). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Entero en [min, max] (ambos incluidos). */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Elemento al azar de una lista no vacía. */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Copia barajada (Fisher-Yates). */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Clave de fecha local YYYY-MM-DD. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Semilla del reto diario de una actividad: igual para todos en esa fecha. */
export function dailySeed(day: string, activityId: string): number {
  return hashString(`sesolibre-mind:${day}:${activityId}`);
}

/** Semilla nueva para una partida libre. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
