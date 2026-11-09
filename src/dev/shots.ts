/**
 * Modo capturas (solo en compilaciones con VITE_SHOTS=1; nunca en la tienda).
 *
 * El workflow de capturas sirve la web desde la Mac y escribe en
 * `shots/scene.json` qué escena quiere: idioma, ruta y acciones. Esta página
 * lo consulta cada medio segundo, carga datos de ejemplo (racha, resultados,
 * niveles) la primera vez y en cada cambio de idioma, navega y ejecuta las
 * acciones (tocar botones, pedir pistas) para dejar la pantalla lista.
 */
import { rawStorage } from '../core/storage';
import { activities, scoreKey } from '../core/registry';
import { TARGET } from '../core/profile';
import { dateKey, mulberry32 } from '../core/rng';
import { dailyPlan } from '../core/session';
import type { Lang } from '../core/i18n';

type Action =
  /** Toca el primer botón cuyo texto es alguno de estos (es / en). */
  | { click: string[] }
  /** Toca N veces el botón de pista. */
  | { hints: number }
  | { wait: number };

interface Scene {
  id: string;
  lang: Lang;
  route: string;
  actions?: Action[];
}

const SEEDED = 'shots:lang';
const DAY = 86_400_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Datos de ejemplo verosímiles: tres semanas de práctica que van mejorando. */
async function seed(lang: Lang) {
  for (const k of await rawStorage.keys()) await rawStorage.remove(k);
  const now = Date.now();
  const today = dateKey(new Date());
  const rng = mulberry32(2026);

  await rawStorage.set('settings', {
    theme: 'dark',
    sound: false,
    motion: true,
    lang,
    colorblind: false,
    serene: false,
    reminder: false,
    reminderTime: '19:00',
    compare: false,
    initials: '',
  });
  await rawStorage.set(
    'tutorials:seen',
    activities.map((a) => a.id),
  );

  // Constancia: 24 de los últimos 30 días, con racha actual de 9.
  const activeDays: string[] = [];
  for (let d = 29; d >= 0; d--)
    if (d < 9 || rng() < 0.7) activeDays.push(dateKey(new Date(now - d * DAY)));
  await rawStorage.set('rewards:state', {
    lastActiveDay: today,
    streak: 9,
    bestStreak: 14,
    activeDays,
    achievements: ['streak_3', 'streak_7'],
  });

  // Resultados en el nivel normal de cada actividad, mejorando con el tiempo.
  const passes: Record<string, number> = {};
  const current: Record<string, string> = {};
  for (const a of activities.filter((x) => x.available)) {
    const level = a.normal;
    const target = TARGET[a.id]?.[level];
    if (!target) continue;
    current[a.id] = level;
    const n = 6 + Math.floor(rng() * 6);
    const history = Array.from({ length: n }, (_, k) => {
      const progress = k / (n - 1); // 0 = más antiguo, 1 = más reciente
      const noise = 0.9 + rng() * 0.2;
      const value = a.higherIsBetter
        ? Math.max(1, Math.round(target * (0.7 + 0.35 * progress) * noise))
        : Math.max(3, Math.round(target * (1.5 - 0.6 * progress) * noise));
      return {
        value,
        at: now - (n - 1 - k) * 2 * DAY - 3_600_000,
        meta: { difficulty: level },
      };
    }).reverse(); // más recientes primero
    const best = history.reduce((b, e) =>
      a.higherIsBetter ? (e.value > b.value ? e : b) : e.value < b.value ? e : b,
    );
    await rawStorage.set(`scores:${scoreKey(a.id, level)}`, { best, history });
    passes[`${a.id}:${level}`] = 1 + Math.floor(rng() * 2);
  }
  await rawStorage.set('levels:state', { start: 'normal', current, passes });

  // Sesión del día a medias: dos ejercicios hechos.
  const plan = dailyPlan(today);
  await rawStorage.set(`session:${today}`, {
    day: today,
    results: plan.steps.slice(0, 2).map((id) => ({ id, score: 0 })),
  });
}

function findButton(texts: string[]): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find((b) =>
    texts.some((t) => b.textContent?.trim() === t),
  );
}

async function run(actions: Action[]) {
  for (const a of actions) {
    if ('wait' in a) await sleep(a.wait);
    else if ('click' in a) {
      for (let t = 0; t < 20; t++) {
        const b = findButton(a.click);
        if (b) {
          b.click();
          break;
        }
        await sleep(150);
      }
      await sleep(400);
    } else {
      for (let k = 0; k < a.hints; k++) {
        const b = [...document.querySelectorAll('button')].find((x) =>
          /💡/.test(x.textContent ?? ''),
        );
        if (!b || b.disabled) break;
        b.click();
        await sleep(250);
      }
    }
  }
}

export function start() {
  let last = '';
  const tick = async () => {
    try {
      const res = await fetch(`/shots/scene.json?t=${Date.now()}`);
      if (res.ok) {
        const scene = (await res.json()) as Scene;
        const sig = JSON.stringify(scene);
        if (sig !== last) {
          last = sig;
          if (sessionStorage.getItem(SEEDED) !== scene.lang) {
            await seed(scene.lang);
            sessionStorage.setItem(SEEDED, scene.lang);
            location.hash = `#${scene.route}`;
            location.reload();
            return;
          }
          if (location.hash !== `#${scene.route}`) {
            location.hash = `#${scene.route}`;
            await sleep(1500);
          }
          window.scrollTo(0, 0);
          await run(scene.actions ?? []);
          window.scrollTo(0, 0);
        }
      }
    } catch {
      // sin servidor de escenas: nada que hacer
    }
    setTimeout(() => void tick(), 500);
  };
  void tick();
}
