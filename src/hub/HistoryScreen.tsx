import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Screen from '../ui/Screen';
import { useT } from '../core/i18n';
import { findActivity, scoreKey, type ActivityMeta } from '../core/registry';
import { fetchTop, type TopRow } from '../core/online';
import { ScoreService, type ScoreEntry } from '../core/ScoreService';
import { formatActivityScore } from '../core/format';
import { resolveLang, type Lang } from '../core/i18n';
import { useSettings } from '../core/settings';
import { levelOf, useLevels } from '../core/levels';
import TrendChart from './TrendChart';

/** Mejores resultados publicados en línea (si se activó «Comparar en línea»). */
function OnlineTop({
  activity,
  level,
  lang,
  fmt,
}: {
  activity: ActivityMeta;
  level: string;
  lang: Lang;
  fmt: (v: number) => string;
}) {
  const t = useT();
  const { compare, serene } = useSettings();
  // Casi todo se juega en modo libre: se empieza por la tabla de siempre.
  const [daily, setDaily] = useState(false);
  const [rows, setRows] = useState<TopRow[] | null | 'off'>(null);
  useEffect(() => {
    if (!compare || serene) return;
    let alive = true;
    setRows(null);
    void fetchTop(
      {
        activityId: activity.id,
        level,
        lang: activity.wordGame ? lang : undefined,
        daily,
      },
      10,
    ).then((r) => alive && setRows(r ?? 'off'));
    return () => {
      alive = false;
    };
  }, [compare, serene, activity, level, lang, daily]);
  if (!compare || serene || rows === 'off') return null;

  return (
    <section className="rounded-2xl border border-app-border bg-app-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
          🌐 {t('history.online')}
        </h2>
        <div className="flex gap-1" role="group">
          {[false, true].map((d) => (
            <button
              key={String(d)}
              onClick={() => setDaily(d)}
              aria-pressed={daily === d}
              className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                daily === d ? 'bg-brand text-white' : 'bg-app-surface2'
              }`}
            >
              {t(d ? 'history.onlineDay' : 'history.onlineAll')}
            </button>
          ))}
        </div>
      </div>
      {rows === null ? (
        <p className="text-sm text-app-muted">…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-app-muted">{t('history.onlineEmpty')}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-app-border text-sm">
          {rows.map((r, k) => (
            <li key={k} className="flex justify-between py-1">
              <span>
                <span className="inline-block w-6 text-app-muted">{k + 1}</span>
                <span className="font-mono font-bold tracking-widest">{r.ini}</span>
              </span>
              <span className="tabular-nums">{fmt(r.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Historial de una actividad: gráfica por nivel, mejor/promedio/último y lista. */
export default function HistoryScreen() {
  const { id } = useParams();
  const t = useT();
  const activity = findActivity(id);
  const levels = useLevels();
  const lang = resolveLang(useSettings((s) => s.lang));
  const [byLevel, setByLevel] = useState<Record<string, ScoreEntry[]> | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  useEffect(() => {
    if (!activity) return;
    void Promise.all(
      activity.variants.map((v) => ScoreService.get(scoreKey(activity.id, v))),
    ).then((rs) => {
      const map = Object.fromEntries(activity.variants.map((v, k) => [v, rs[k].history]));
      setByLevel(map);
      // Nivel inicial: el actual si tiene datos; si no, el que más tenga.
      const cur = levelOf(levels, activity);
      const withData = activity.variants.filter((v) => map[v].length);
      setLevel(
        map[cur]?.length
          ? cur
          : (withData.sort((a, b) => map[b].length - map[a].length)[0] ?? cur),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id]);

  const entries = useMemo(
    () => (byLevel && level ? [...byLevel[level]].reverse() : []),
    [byLevel, level],
  );
  if (!activity) return null;

  const lowerIsBetter = !activity.higherIsBetter;
  const fmt = (v: number) => formatActivityScore(activity, v);
  const fmtDate = (at: number) =>
    new Date(at).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
  const vals = entries.map((e) => e.value);
  const best = vals.length
    ? lowerIsBetter
      ? Math.min(...vals)
      : Math.max(...vals)
    : null;
  const mean = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;

  return (
    <Screen title={`${activity.emoji} ${t(`act.${activity.id}.title`)}`}>
      <div className="flex flex-col gap-3">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={t('history.level')}
        >
          {activity.variants.map((v, k) => {
            const n = byLevel?.[v]?.length ?? 0;
            return (
              <button
                key={v}
                onClick={() => setLevel(v)}
                aria-pressed={v === level}
                disabled={!n}
                className={`rounded-lg px-2.5 py-1 text-sm font-semibold transition disabled:opacity-35 ${
                  v === level
                    ? 'bg-brand text-white'
                    : 'bg-app-surface hover:bg-app-surface2'
                }`}
              >
                {t('level.n', { n: k + 1 })}
              </button>
            );
          })}
        </div>

        {!byLevel ? (
          <p className="text-app-muted">…</p>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl border border-app-border bg-app-surface p-4 text-app-muted">
            {t('history.empty')}
          </p>
        ) : (
          <>
            <section className="rounded-2xl border border-app-border bg-app-surface p-3">
              <TrendChart
                points={entries.map((e) => ({ at: e.at, value: e.value }))}
                lowerIsBetter={lowerIsBetter}
                format={fmt}
                formatDate={fmtDate}
                label={t('history.chart', { n: entries.length })}
              />
              <p className="text-center text-xs text-app-muted">
                {t('history.upIsBetter')}
              </p>
            </section>

            <section className="grid grid-cols-3 gap-2 text-center">
              {[
                [t('history.best'), best !== null ? fmt(best) : '—'],
                [t('history.mean'), mean !== null ? fmt(Math.round(mean)) : '—'],
                [t('history.last'), fmt(entries[entries.length - 1].value)],
              ].map(([label, v]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-app-border bg-app-surface p-2"
                >
                  <p className="text-lg font-bold tabular-nums">{v}</p>
                  <p className="text-xs text-app-muted">{label}</p>
                </div>
              ))}
            </section>

            {level && (
              <OnlineTop activity={activity} level={level} lang={lang} fmt={fmt} />
            )}

            <section className="rounded-2xl border border-app-border bg-app-surface p-3">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-app-muted">
                {t('history.list')}
              </h2>
              <ul className="flex flex-col divide-y divide-app-border text-sm">
                {[...entries]
                  .reverse()
                  .slice(0, 15)
                  .map((e) => (
                    <li key={e.at} className="flex justify-between py-1.5">
                      <span className="text-app-muted">{fmtDate(e.at)}</span>
                      <span className="tabular-nums">
                        {fmt(e.value)}
                        {e.value === best && ' 🏆'}
                        {typeof e.meta?.hints === 'number' &&
                          e.meta.hints > 0 &&
                          ` · 💡${e.meta.hints}`}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </Screen>
  );
}
