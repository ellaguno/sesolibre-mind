import { useMemo, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import { formatDuration } from '../../core/format';
import { mulberry32 } from '../../core/rng';
import { errorsText } from '../common/text';
import ExerciseShell, { type RunProps } from '../common/ExerciseShell';
import Feedback from '../common/Feedback';
import { useStopwatch } from '../common/useStopwatch';
import {
  COLORS,
  COLORS_CB,
  INK,
  LEVELS,
  passed,
  score,
  trials,
  type Color,
  type Level,
} from './logic';
import { useActivityLevel } from '../../core/levels';
import { levelOptions } from '../common/levelOptions';

import { useSettings } from '../../core/settings';

function Run({ seed, finish, lv }: RunProps & { lv: Level }) {
  const t = useT();
  const colorblind = useSettings((s) => s.colorblind);
  const colors = useMemo(
    () => (colorblind ? COLORS_CB : COLORS).slice(0, lv.colors),
    [colorblind, lv.colors],
  );
  const list = useMemo(
    () => trials(mulberry32(seed), lv.count, colors, lv.congruent),
    [seed, lv, colors],
  );
  const [k, setK] = useState(0);
  const [errors, setErrors] = useState(0);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const clock = useStopwatch();
  const serene = useSettings((s) => s.serene);
  const trial = list[k];

  const answer = (c: Color) => {
    const ok = c === trial.ink;
    AudioService.play(ok ? 'correct' : 'wrong');
    setFb(ok ? 'ok' : 'bad');
    setTimeout(() => setFb(null), 300);
    const errs = errors + (ok ? 0 : 1);
    setErrors(errs);
    if (k + 1 === list.length) {
      const s = score(clock.ms(), errs, serene ? 0 : undefined);
      finish({
        score: s,
        headline: formatDuration(s),
        detail: errorsText(t, errs),
        meta: { errors: errs },
        passed: passed(errs),
      });
    } else setK(k + 1);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-between text-sm text-app-muted">
        <span>
          {k + 1}/{list.length}
        </span>
        {!serene && (
          <span className="font-mono tabular-nums">{formatDuration(clock.elapsed)}</span>
        )}
      </div>
      <div className="relative flex flex-1 items-center justify-center rounded-2xl bg-slate-50 py-12">
        <Feedback kind={fb} />
        <p
          key={k}
          className="overlay-pop text-6xl font-black uppercase tracking-wide"
          style={{ color: INK[trial.ink] }}
          aria-label={t('colorclash.aria', {
            word: t(`color.${trial.word}`),
            ink: t(`color.${trial.ink}`),
          })}
        >
          {t(`color.${trial.word}`)}
        </p>
      </div>
      <p className="text-center text-sm text-app-muted">{t('colorclash.prompt')}</p>
      <div className="grid grid-cols-2 gap-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => answer(c)}
            className="rounded-2xl bg-app-surface py-5 text-xl font-bold transition hover:bg-app-surface2 active:scale-95"
          >
            {t(`color.${c}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ColorClashExercise(props: GameProps) {
  const t = useT();
  const [level, setLevel] = useActivityLevel(
    'colorclash',
    props.daily || !!props.inSession,
  );
  const lv = LEVELS[level] ?? LEVELS['3'];
  return (
    <ExerciseShell
      {...props}
      activityId="colorclash"
      emoji="🎨"
      instructions={[
        lv.congruent === 1 ? t('colorclash.i1easy') : t('colorclash.i1'),
        t('colorclash.i2'),
        t('colorclash.i3', { n: lv.count }),
      ]}
      variants={levelOptions('colorclash', t)}
      variant={level}
      onVariant={setLevel}
    >
      {(run) => <Run {...run} lv={lv} />}
    </ExerciseShell>
  );
}
