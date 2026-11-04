import { useCallback, useMemo, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import { formatDuration } from '../../core/format';
import { mulberry32 } from '../../core/rng';
import { errorsText } from '../common/text';
import ExerciseShell, { type RunProps } from '../common/ExerciseShell';
import NumPad from '../common/NumPad';
import Feedback from '../common/Feedback';
import { useStopwatch } from '../common/useStopwatch';
import { COUNT, check, problems, score } from './logic';

function Run({ seed, finish }: RunProps) {
  const t = useT();
  const list = useMemo(() => problems(mulberry32(seed)), [seed]);
  const [k, setK] = useState(0);
  const [typed, setTyped] = useState('');
  const [errors, setErrors] = useState(0);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const clock = useStopwatch();
  const p = list[k];

  const next = useCallback(
    (wasError: boolean) => {
      const errs = errors + (wasError ? 1 : 0);
      setErrors(errs);
      setTyped('');
      if (k + 1 === list.length) {
        const s = score(clock.ms(), errs);
        finish({
          score: s,
          headline: formatDuration(s),
          detail: errorsText(t, errs),
          meta: { errors: errs },
        });
      } else setK(k + 1);
    },
    [errors, k, list.length, clock, finish, t],
  );

  const onDigit = useCallback(
    (d: number) => {
      const v = (typed + d).replace(/^0+(?=\d)/, '');
      const res = check(p, v);
      if (res === 'pending') return setTyped(v);
      setFb(res === 'correct' ? 'ok' : 'bad');
      setTimeout(() => setFb(null), 350);
      AudioService.play(res === 'correct' ? 'correct' : 'wrong');
      next(res === 'wrong');
    },
    [typed, p, next],
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-between text-sm text-app-muted">
        <span>
          {k + 1}/{COUNT}
        </span>
        <span className="font-mono tabular-nums">{formatDuration(clock.elapsed)}</span>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center rounded-2xl bg-app-surface py-8">
        <Feedback kind={fb} />
        <p className="text-6xl font-black tabular-nums" aria-live="polite">
          {p.a} {p.op} {p.b}
        </p>
        <p className="mt-4 min-h-[3.5rem] text-5xl font-bold text-brand tabular-nums">
          {typed || '?'}
        </p>
      </div>
      <NumPad onDigit={onDigit} onBackspace={() => setTyped((s) => s.slice(0, -1))} />
    </div>
  );
}

export default function QuickMathExercise(props: GameProps) {
  const t = useT();
  return (
    <ExerciseShell
      {...props}
      activityId="quickmath"
      emoji="➗"
      instructions={[t('quickmath.i1'), t('quickmath.i2'), t('quickmath.i3')]}
    >
      {(run) => <Run {...run} />}
    </ExerciseShell>
  );
}
