import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import { formatDuration } from '../../core/format';
import { mulberry32 } from '../../core/rng';
import { useSettings } from '../../core/settings';

import { errorsText } from '../common/text';
import ExerciseShell, { type RunProps } from '../common/ExerciseShell';
import NumPad from '../common/NumPad';
import Feedback from '../common/Feedback';
import { useStopwatch } from '../common/useStopwatch';
import { LEVELS, canContinue, startValue, type Level } from './logic';
import { useActivityLevel } from '../../core/levels';
import { levelOptions } from '../common/levelOptions';

/** Respuestas por partida en modo sereno (sin límite de tiempo). */
const SERENE_ANSWERS = 12;

function Run({ seed, finish, lv }: RunProps & { lv: Level }) {
  const t = useT();
  const { step } = lv;
  const start = useMemo(() => startValue(mulberry32(seed), lv), [seed, lv]);
  const [current, setCurrent] = useState(start);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);
  const clock = useStopwatch();
  // Modo sereno: sin límite de tiempo; termina tras SERENE_ANSWERS respuestas.
  const serene = useSettings((s) => s.serene);
  const left = Math.max(0, lv.seconds - clock.elapsed);
  const done = useRef(false);

  const end = (c: number, e: number) => {
    if (done.current) return;
    done.current = true;
    finish({
      score: c,
      headline: t('countdown.headline', { n: c }),
      detail: errorsText(t, e),
      meta: { errors: e },
      passed: c >= lv.pass,
    });
  };

  useEffect(() => {
    if (!serene && left === 0) end(correct, errors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const submit = () => {
    if (!typed) return;
    const target = current - step;
    const ok = Number(typed) === target;
    AudioService.play(ok ? 'correct' : 'wrong');
    setFb(ok ? 'ok' : 'bad');
    setTimeout(() => setFb(null), 350);
    setTyped('');
    const c = correct + (ok ? 1 : 0);
    const e = errors + (ok ? 0 : 1);
    setCorrect(c);
    setErrors(e);
    if (!ok) {
      setReveal(target);
      setTimeout(() => setReveal(null), 1200);
    }
    setCurrent(target);
    if (!canContinue(target, step) || (serene && c + e >= SERENE_ANSWERS)) end(c, e);
  };

  const first = current === start;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-between text-sm text-app-muted">
        <span>{t('countdown.correct', { n: correct })}</span>
        <span className="font-mono tabular-nums">
          {serene ? `${correct + errors}/${SERENE_ANSWERS}` : formatDuration(left)}
        </span>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-app-surface py-8 text-center">
        <Feedback kind={fb} />
        {first ? (
          <p className="text-2xl">{t('countdown.startFrom', { start, step })}</p>
        ) : (
          <p className="text-2xl text-app-muted">{t('countdown.keepGoing', { step })}</p>
        )}
        {reveal !== null && (
          <p className="text-sm text-red-500">{t('countdown.was', { n: reveal })}</p>
        )}
        <p className="mt-2 min-h-[3.5rem] text-5xl font-bold text-brand tabular-nums">
          {typed || '?'}
        </p>
      </div>
      <NumPad
        onDigit={(d) => setTyped((s) => (s + d).slice(0, 3))}
        onBackspace={() => setTyped((s) => s.slice(0, -1))}
        onSubmit={submit}
      />
    </div>
  );
}

export default function CountdownExercise(props: GameProps) {
  const t = useT();
  const [level, setLevel] = useActivityLevel(
    'countdown',
    props.daily || !!props.inSession,
    props.challenge?.level,
  );
  const lv = LEVELS[level] ?? LEVELS['3'];
  return (
    <ExerciseShell
      {...props}
      activityId="countdown"
      emoji="➖"
      instructions={[
        t('countdown.i1', { step: lv.step }),
        t('countdown.i2'),
        t('countdown.i3', { s: lv.seconds }),
      ]}
      variants={levelOptions('countdown', t)}
      variant={level}
      onVariant={setLevel}
    >
      {(run) => <Run {...run} lv={lv} />}
    </ExerciseShell>
  );
}
