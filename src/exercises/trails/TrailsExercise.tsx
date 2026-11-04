import { useMemo, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import { formatDuration } from '../../core/format';
import { mulberry32 } from '../../core/rng';
import { errorsText } from '../common/text';
import ExerciseShell, { type RunProps } from '../common/ExerciseShell';
import { useStopwatch } from '../common/useStopwatch';
import { labels, positions, score, type Mode } from './logic';

function Run({ seed, finish, mode }: RunProps & { mode: Mode }) {
  const t = useT();
  const items = useMemo(() => labels(mode), [mode]);
  const pts = useMemo(
    () => positions(mulberry32(seed), items.length),
    [seed, items.length],
  );
  const [next, setNext] = useState(0);
  const [errors, setErrors] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const clock = useStopwatch();

  const tap = (k: number) => {
    if (k < next) return;
    if (k !== next) {
      AudioService.play('wrong');
      setErrors((e) => e + 1);
      setShake(k);
      setTimeout(() => setShake(null), 400);
      return;
    }
    AudioService.play('correct');
    if (k + 1 === items.length) {
      const s = score(clock.ms(), errors);
      finish({
        score: s,
        headline: formatDuration(s),
        detail: errorsText(t, errors),
        meta: { errors, difficulty: mode },
      });
    }
    setNext(k + 1);
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex justify-between text-sm text-app-muted">
        <span>{t('trails.next', { v: items[next] ?? '' })}</span>
        <span className="font-mono tabular-nums">{formatDuration(clock.elapsed)}</span>
      </div>
      <div className="relative aspect-square w-full rounded-2xl bg-slate-50">
        <svg viewBox="0 0 1 1" className="absolute inset-0 h-full w-full" aria-hidden>
          {next > 1 && (
            <polyline
              points={pts
                .slice(0, next)
                .map((p) => `${p.x},${p.y}`)
                .join(' ')}
              fill="none"
              stroke="#6366f1"
              strokeWidth={0.012}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        {items.map((label, k) => {
          const done = k < next;
          return (
            <button
              key={label}
              onClick={() => tap(k)}
              aria-label={label}
              className={`absolute flex h-[13%] w-[13%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-lg font-bold transition ${
                done
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-700 bg-white text-slate-900 active:scale-95'
              } ${shake === k ? 'bg-red-200' : ''}`}
              style={{ left: `${pts[k].x * 100}%`, top: `${pts[k].y * 100}%` }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TrailsExercise(props: GameProps) {
  const t = useT();
  const [mode, setMode] = useState<Mode>('B');
  return (
    <ExerciseShell
      {...props}
      activityId="trails"
      emoji="🔗"
      instructions={[t('trails.i1'), t('trails.i2'), t('trails.i3')]}
      variants={[
        { id: 'A', label: t('trails.modeA') },
        { id: 'B', label: t('trails.modeB') },
      ]}
      variant={mode}
      onVariant={(id) => setMode(id as Mode)}
    >
      {(run) => <Run {...run} mode={mode} />}
    </ExerciseShell>
  );
}
