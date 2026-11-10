import { useEffect, useState } from 'react';
import { useT } from '../core/i18n';
import { useSettings } from '../core/settings';
import {
  fetchStanding,
  publishScore,
  allowedInitials,
  blockedInitials,
  type Board,
  type Standing,
} from '../core/online';
import InitialsInput from './InitialsInput';
import OnlineInvite from './OnlineInvite';

/**
 * Al terminar: cómo queda el resultado frente a lo publicado por otros y botón
 * para publicarlo con 3 iniciales. Solo si se activó «Comparar en línea», sin
 * pistas. Si está apagado, invita a activarlo. Sin red no muestra nada.
 */
export default function OnlineCompare({
  board,
  score,
  hints,
}: {
  board: Board;
  score: number;
  hints: number;
}) {
  const t = useT();
  const { compare, initials, setInitials } = useSettings();
  // Opcional y apagado por defecto; si está apagado se invita a activarlo.
  const enabled = compare;
  const [standing, setStanding] = useState<Standing | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [published, setPublished] = useState<{ rank: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const key = `${board.activityId}:${board.level}:${board.lang ?? ''}:${board.daily}:${score}`;

  useEffect(() => {
    setStanding(null);
    setPublished(null);
    setError(null);
    setState('idle');
    if (!enabled || hints > 0) return;
    let alive = true;
    void fetchStanding(board, score).then((r) => {
      if (alive && r && !('error' in r)) setStanding(r);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, hints]);

  if (!enabled) return hints > 0 ? null : <OnlineInvite label={t('online.invite')} />;
  if (hints > 0)
    return <p className="text-xs text-app-muted">🌐 {t('online.noHints')}</p>;
  if (!standing) return null; // cargando o sin red: no se muestra nada

  const publish = async () => {
    if (!allowedInitials(initials)) return;
    setState('sending');
    const r = await publishScore(board, initials, score);
    if (r && 'ok' in r) {
      setPublished({ rank: r.rank, total: r.total });
      setState('idle');
    } else {
      // El servidor responde en español: se traducen los casos conocidos.
      const msg = r && 'error' in r ? r.error : null;
      setError(
        !msg
          ? t('online.offline')
          : /iniciales/.test(msg)
            ? t('online.badInitials')
            : /429|demasiados/.test(msg)
              ? t('online.tooMany')
              : t('online.error'),
      );
      setState('error');
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-1.5 rounded-xl bg-sky-500/15 px-3 py-2 text-sm">
      <p className="font-semibold" aria-live="polite">
        🌐{' '}
        {published
          ? t('online.published', { rank: published.rank, total: published.total })
          : standing.total === 0
            ? t('online.first')
            : t('online.better', { pct: standing.pct ?? 0, n: standing.total })}
      </p>
      {!published && (
        <div className="flex items-center gap-2">
          <InitialsInput
            value={initials}
            onChange={setInitials}
            label={t('settings.initials')}
            className="!w-16 !p-1 !text-base"
          />
          <button
            onClick={() => void publish()}
            disabled={!allowedInitials(initials) || state === 'sending'}
            className="rounded-lg bg-sky-600 px-3 py-1.5 font-bold text-white disabled:opacity-40"
          >
            {state === 'sending' ? '…' : t('online.publish')}
          </button>
        </div>
      )}
      {!published && blockedInitials(initials) && (
        <p className="text-xs text-red-400">{t('online.badInitials')}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
