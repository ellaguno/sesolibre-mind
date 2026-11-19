import { useState } from 'react';
import Screen from '../ui/Screen';
import OnlineTop from '../ui/OnlineTop';
import { resolveLang, useT } from '../core/i18n';
import { activities } from '../core/registry';
import { formatActivityScore } from '../core/format';
import { useSettings } from '../core/settings';
import { levelOf, useLevels } from '../core/levels';

/** Página pública con todas las tablas (la misma que lee la app). */
export const PUBLIC_BOARD = 'https://games.sesolibre.com/score/';

/** Récords en línea: la tabla de cualquier actividad y nivel. */
export default function OnlineScreen() {
  const t = useT();
  const levels = useLevels();
  const lang = resolveLang(useSettings((s) => s.lang));
  const list = activities.filter((a) => a.available);
  const [activity, setActivity] = useState(list[0]);
  const [level, setLevel] = useState(() => levelOf(levels, list[0]));
  const choose = (id: string) => {
    const a = list.find((x) => x.id === id) ?? list[0];
    setActivity(a);
    setLevel(levelOf(levels, a));
  };

  return (
    <Screen title={t('online.records')}>
      <div className="flex flex-col gap-3">
        <ul className="flex flex-wrap gap-1.5" aria-label={t('online.pick')}>
          {list.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => choose(a.id)}
                aria-pressed={a.id === activity.id}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-sm font-medium ${
                  a.id === activity.id
                    ? 'bg-brand text-white'
                    : 'bg-app-surface2 hover:bg-app-border'
                }`}
              >
                <span aria-hidden>{a.emoji}</span>
                <span>{t(`act.${a.id}.title`)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={t('history.level')}
        >
          {activity.variants.map((v, k) => (
            <button
              key={v}
              onClick={() => setLevel(v)}
              aria-pressed={v === level}
              className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${
                v === level ? 'bg-brand text-white' : 'bg-app-surface2'
              }`}
            >
              {t('level.n', { n: k + 1 })}
            </button>
          ))}
        </div>
        <OnlineTop
          key={`${activity.id}:${level}`}
          activity={activity}
          level={level}
          lang={lang}
          fmt={(v) => formatActivityScore(activity, v)}
        />
        <a
          href={PUBLIC_BOARD}
          target="_blank"
          rel="noreferrer"
          className="text-center text-sm font-semibold text-brand underline"
        >
          {t('online.webPage')}
        </a>
      </div>
    </Screen>
  );
}
