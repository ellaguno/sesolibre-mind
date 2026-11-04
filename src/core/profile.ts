import {
  activities,
  scoreKey,
  DOMAINS,
  type ActivityMeta,
  type Domain,
} from './registry';
import { ScoreService, type ScoreEntry } from './ScoreService';

/**
 * Índice Seso: un valor 0–100 por habilidad, sólo para compararte contigo
 * mismo. No es una medida clínica ni una «edad».
 *
 * Cada resultado se normaliza a 0–100 frente a una referencia de la actividad
 * (tiempo objetivo o puntuación objetivo); el índice de una habilidad es la
 * media de sus resultados más recientes.
 */

/** Referencia por actividad y variante: tiempo objetivo (s) o puntos objetivo. */
const TARGET: Record<string, Record<string, number>> = {
  quickmath: { '1': 15, '2': 25, '3': 30, '4': 30, '5': 45 },
  colorclash: { '1': 10, '2': 14, '3': 22, '4': 32 },
  trails: { '5': 6, '10': 12, A: 16, B: 24, B20: 32 },
  countdown: { '1': 20, '2': 18, '3': 20, '7': 15 },
  numberspan: { '2': 6, forward: 8, backward: 7 },
  headcount: { '1': 3, '2': 4, '3': 5 },
  crowns: { '4': 20, '5': 35, '6': 60, '7': 90, '8': 150, '9': 240 },
  sunmoon: { '4': 25, '6': 60, '6h': 120, '8': 240 },
  minisudoku: { '4': 30, easy: 90, hard: 180 },
  plots: { '4': 20, '5': 35, '6': 60, '7': 100, '8': 180 },
  thread: { '4': 15, '5': 28, '6': 45, '7': 80, '8': 150 },
};
/** Puntos que resta cada pista usada en un puzzle. */
const HINT_COST = 10;
/** Resultados recientes que se promedian por habilidad. */
const RECENT = 10;

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function normalize(
  a: ActivityMeta,
  variant: string,
  entry: ScoreEntry,
): number | null {
  const target = TARGET[a.id]?.[variant];
  if (!target) return null;
  const hints = Number(entry.meta?.hints ?? 0);
  const raw =
    a.scoreKind === 'time'
      ? (100 * target) / Math.max(1, entry.value)
      : (100 * entry.value) / target;
  return clamp(raw - hints * HINT_COST);
}

export interface DomainIndex {
  domain: Domain;
  /** null si aún no hay resultados de esa habilidad. */
  value: number | null;
  samples: number;
}

export async function computeProfile(): Promise<DomainIndex[]> {
  const byDomain = new Map<Domain, { at: number; v: number }[]>();
  for (const a of activities) {
    if (!a.available) continue;
    for (const variant of a.variants) {
      const { history } = await ScoreService.get(scoreKey(a.id, variant));
      for (const e of history) {
        const v = normalize(a, variant, e);
        if (v === null) continue;
        byDomain.set(a.domain, [...(byDomain.get(a.domain) ?? []), { at: e.at, v }]);
      }
    }
  }
  return DOMAINS.filter((d) => activities.some((a) => a.available && a.domain === d)).map(
    (domain) => {
      const recent = (byDomain.get(domain) ?? [])
        .sort((x, y) => y.at - x.at)
        .slice(0, RECENT);
      return {
        domain,
        samples: recent.length,
        value: recent.length
          ? Math.round(recent.reduce((s, r) => s + r.v, 0) / recent.length)
          : null,
      };
    },
  );
}
