import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../ui/Screen';
import Button from '../ui/Button';
import { useT } from '../core/i18n';
import { findActivity } from '../core/registry';
import { formatActivityScore } from '../core/format';
import { decodeChallenge, encodeChallenge, normalizeCode } from '../core/challenge';

/** Aceptar el reto de un amigo: se escribe su código y se juega el mismo tablero. */
export default function ChallengeScreen() {
  const t = useT();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const challenge = useMemo(() => decodeChallenge(code), [code]);
  const activity = challenge ? findActivity(challenge.activityId) : undefined;
  const complete = normalizeCode(code).length >= 16;

  return (
    <Screen title={t('challenge.title')}>
      <div className="flex flex-col gap-4">
        <p className="text-app-muted">{t('challenge.intro')}</p>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('challenge.codeLabel')}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={24}
            className="rounded-xl border border-app-border bg-app-surface px-4 py-3 text-center font-mono text-xl tracking-widest"
          />
        </label>

        {challenge && activity ? (
          <div className="overlay-pop flex flex-col gap-3 rounded-2xl border border-brand bg-app-surface p-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden>
                {activity.emoji}
              </span>
              <div>
                <p className="text-lg font-bold">{t(`act.${activity.id}.title`)}</p>
                <p className="text-sm text-app-muted">
                  {t('level.n', { n: activity.variants.indexOf(challenge.level) + 1 })}
                </p>
              </div>
            </div>
            <p>
              {t(
                activity.higherIsBetter
                  ? 'challenge.toBeatPoints'
                  : 'challenge.toBeatTime',
                {
                  score: formatActivityScore(activity, challenge.score),
                },
              )}
            </p>
            <Button
              onClick={() =>
                navigate(`/play/${activity.id}?reto=${encodeChallenge(challenge)}`)
              }
              className="py-3 text-lg"
            >
              {t('challenge.accept')}
            </Button>
          </div>
        ) : (
          complete && (
            <p className="text-sm text-red-500" aria-live="polite">
              {t('challenge.invalid')}
            </p>
          )
        )}

        <div className="rounded-2xl border border-app-border bg-app-surface p-4 text-sm text-app-muted">
          <p className="font-semibold text-app-text">{t('challenge.howTitle')}</p>
          <p className="mt-1">{t('challenge.how')}</p>
        </div>
      </div>
    </Screen>
  );
}
