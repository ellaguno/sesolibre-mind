import { activities, findActivity } from './registry';
import type { Lang } from './i18n';
import { hashString } from './rng';

/**
 * Reto entre amigos, sin servidor: un código corto que describe la partida
 * (actividad, nivel, semilla del tablero) y el resultado de quien reta. Quien
 * lo recibe juega exactamente el mismo tablero o ejercicio y compara.
 *
 * Formato (16 caracteres, base32 de Crockford, sin I/L/O/U para no confundir):
 *   v(1) actividad(1) nivel(1) semilla(7) puntuación(3) control(3)
 * mostrado como XXXX-XXXX-XXXX-XXXX. Al leer, I/L → 1 y O → 0.
 *
 * En los juegos de palabras el tablero depende del idioma: el carácter del
 * nivel lleva +16 si quien retó juega en inglés (los códigos viejos, sin ese
 * +16, se leen como español, que es lo que eran).
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VERSION = 1;
const SCORE_MAX = 32 ** 3 - 1;

export interface Challenge {
  activityId: string;
  level: string;
  seed: number;
  /** Resultado de quien reta (segundos o puntos según la actividad). */
  score: number;
  /** Idioma del tablero (solo en juegos de palabras). */
  lang?: Lang;
}

const LANG_OFFSET = 16;

function enc(n: number, width: number): string {
  let out = '';
  for (let k = 0; k < width; k++) {
    out = ALPHABET[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return out;
}

function dec(s: string): number {
  let n = 0;
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return NaN;
    n = n * 32 + v;
  }
  return n;
}

const checksum = (body: string) => enc(hashString(`sesolibre-mind:${body}`) % 32 ** 3, 3);

export function encodeChallenge(c: Challenge): string {
  const a = activities.findIndex((x) => x.id === c.activityId);
  const act = activities[a];
  const l = act ? act.variants.indexOf(c.level) : -1;
  if (a < 0 || l < 0) throw new Error(`reto inválido: ${c.activityId}/${c.level}`);
  const lv = act.wordGame && c.lang === 'en' ? l + LANG_OFFSET : l;
  const score = Math.max(0, Math.min(SCORE_MAX, Math.round(c.score)));
  const body =
    enc(VERSION, 1) + enc(a, 1) + enc(lv, 1) + enc(c.seed >>> 0, 7) + enc(score, 3);
  const raw = body + checksum(body);
  return raw.match(/.{4}/g)!.join('-');
}

/** Normaliza lo que escribe la persona: mayúsculas, sin espacios ni guiones, I/L→1, O→0. */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

export function decodeChallenge(input: string): Challenge | null {
  const raw = normalizeCode(input);
  if (raw.length !== 16) return null;
  const body = raw.slice(0, 13);
  if (checksum(body) !== raw.slice(13)) return null;
  if (dec(body[0]) !== VERSION) return null;
  const act = activities[dec(body[1])];
  if (!act?.available) return null;
  let lv = dec(body[2]);
  let lang: Lang | undefined;
  if (act.wordGame) {
    lang = lv >= LANG_OFFSET ? 'en' : 'es';
    if (lv >= LANG_OFFSET) lv -= LANG_OFFSET;
  }
  const level = act.variants[lv];
  if (!level) return null;
  const seed = dec(body.slice(3, 10));
  const score = dec(body.slice(10, 13));
  if (Number.isNaN(seed) || Number.isNaN(score) || seed > 0xffffffff) return null;
  return { activityId: act.id, level, seed, score, ...(lang && { lang }) };
}

/** ¿Ganó quien acepta el reto? Empate cuenta como ganar (igualaste). */
export function beatsChallenge(c: Challenge, myScore: number): boolean {
  const a = findActivity(c.activityId);
  if (!a) return false;
  return a.higherIsBetter ? myScore >= c.score : myScore <= c.score;
}
