import { useEffect, useState } from 'react';
import { useT, type Lang } from '../core/i18n';
import type { ActivityMeta } from '../core/registry';
import { useSettings } from '../core/settings';
import {
  fetchTop,
  hideEntry,
  hiddenEntries,
  reportEntry,
  type TopRow,
} from '../core/online';
import OnlineInvite from './OnlineInvite';

/** Mejores resultados publicados en línea (si se activó «Comparar en línea»). */
export default function OnlineTop({
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
  const { compare } = useSettings();
  // Casi todo se juega en modo libre: se empieza por la tabla de siempre.
  const [daily, setDaily] = useState(false);
  const [rows, setRows] = useState<TopRow[] | null | 'off'>(null);
  // Moderación: entradas ocultadas por esta persona y la que está reportando.
  const [hidden, setHidden] = useState<number[]>([]);
  const [asking, setAsking] = useState<number | null>(null);
  const [thanks, setThanks] = useState(false);
  useEffect(() => {
    void hiddenEntries().then(setHidden);
  }, []);
  const hide = async (id: number, report: boolean) => {
    if (report) {
      await reportEntry(id);
      setThanks(true);
    }
    await hideEntry(id);
    setHidden((h) => [...h, id]);
    setAsking(null);
  };
  useEffect(() => {
    if (!compare) return;
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
  }, [compare, activity, level, lang, daily]);
  if (!compare)
    return (
      <section className="flex flex-col items-center gap-1 rounded-2xl border border-app-border bg-app-surface p-3 text-center">
        <OnlineInvite label={t('history.onlineInvite')} />
      </section>
    );
  if (rows === 'off') return null;

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
          {rows
            .filter((r) => !hidden.includes(r.id))
            .map((r, k) => (
              <li key={r.id} className="py-1">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <span className="inline-block w-6 text-app-muted">{k + 1}</span>
                    <span className="font-mono font-bold tracking-widest">{r.ini}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{fmt(r.score)}</span>
                    <button
                      onClick={() => setAsking(asking === r.id ? null : r.id)}
                      aria-label={t('online.reportAria', { ini: r.ini })}
                      className="rounded px-1.5 text-app-muted hover:bg-app-surface2 hover:text-app-text"
                    >
                      ⚑
                    </button>
                  </span>
                </div>
                {asking === r.id && (
                  <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 text-xs">
                    <span className="text-app-muted">
                      {t('online.reportAsk', { ini: r.ini })}
                    </span>
                    <button
                      onClick={() => void hide(r.id, true)}
                      className="rounded-md bg-red-600 px-2 py-1 font-semibold text-white"
                    >
                      {t('online.report')}
                    </button>
                    <button
                      onClick={() => void hide(r.id, false)}
                      className="rounded-md bg-app-surface2 px-2 py-1 font-semibold"
                    >
                      {t('online.hideForMe')}
                    </button>
                  </div>
                )}
              </li>
            ))}
        </ol>
      )}
      <p className="mt-2 text-xs text-app-muted" aria-live="polite">
        {thanks ? t('online.reportThanks') : t('online.reportNote')}
      </p>
    </section>
  );
}
