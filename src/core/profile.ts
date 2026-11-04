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
  quickmath: { '': 30 },
  colorclash: { '': 22 },
  trails: { A: 16, B: 24 },
  countdown: { '7': 15, '3': 20 },
  numberspan: { forward: 8, backward: 7 },
  headcount: { '': 5 },
  crowns: { '6': 60, '7': 90, '8': 150, '9': 240 },
  sunmoon: { '6': 60, '6h': 120, '8': 240 },
  minisudoku: { easy: 90, hard: 180 },
  plots: { '6': 60, '7': 100, '8': 180 },
  thread: { '6': 45, '7': 80, '8': 150 },
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
  const target = TARGET[a.id]?.[variant] ?? TARGET[a.id]?.[''];
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
    for (const variant of a.variants ?? ['']) {
      const { history } = await ScoreService.get(scoreKey(a.id, variant || null));
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
