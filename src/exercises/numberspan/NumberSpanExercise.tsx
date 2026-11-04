import { useEffect, useMemo, useState } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import { mulberry32 } from '../../core/rng';
import ExerciseShell, { type RunProps } from '../common/ExerciseShell';
import NumPad from '../common/NumPad';
import Feedback from '../common/Feedback';
import {
  GAP_MS,
  MAX_LENGTH,
  SHOW_MS,
  START_LENGTH,
  STRIKES,
  expected,
  sequence,
  type Mode,
} from './logic';

function Run({ seed, finish, mode }: RunProps & { mode: Mode }) {
  const t = useT();
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const [length, setLength] = useState(START_LENGTH);
  const [seq, setSeq] = useState<number[]>(() => sequence(rng, START_LENGTH));
  const [shown, setShown] = useState(0); // dígitos ya mostrados
  const [visible, setVisible] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [strikes, setStrikes] = useState(0);
  const [best, setBest] = useState(0);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const showing = shown < seq.length;

  // Mostrar la serie dígito a dígito.
  useEffect(() => {
    if (!showing) return;
    const on = setTimeout(() => {
      setVisible(seq[shown]);
      AudioService.play('tick');
    }, GAP_MS);
    const off = setTimeout(() => {
      setVisible(null);
      setShown((s) => s + 1);
    }, GAP_MS + SHOW_MS);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [showing, shown, seq]);

  const nextRound = (len: number) => {
    setLength(len);
    setSeq(sequence(rng, len));
    setShown(0);
    setTyped('');
  };

  const submit = (value: string) => {
    const ok = value === expected(seq, mode);
    AudioService.play(ok ? 'correct' : 'wrong');
    setFb(ok ? 'ok' : 'bad');
    setTimeout(() => setFb(null), 450);
    const b = ok ? Math.max(best, length) : best;
    const s = strikes + (ok ? 0 : 1);
    setBest(b);
    setStrikes(s);
    if (s >= STRIKES || (ok && length === MAX_LENGTH)) {
      setTimeout(
        () =>
          finish({
            score: b,
            headline: t('numberspan.headline', { n: b }),
            meta: { difficulty: mode },
          }),
        500,
      );
      return;
    }
    setTimeout(() => nextRound(ok ? length + 1 : length), 600);
  };

  const onDigit = (d: number) => {
    if (showing) return;
    const v = typed + d;
    setTyped(v);
    if (v.length === seq.length) submit(v);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-between text-sm text-app-muted">
        <span>{t('numberspan.length', { n: length })}</span>
        <span>{'❤️'.repeat(STRIKES - strikes)}</span>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center rounded-2xl bg-app-surface py-10">
        <Feedback kind={fb} />
        {showing ? (
          <p className="text-8xl font-black tabular-nums" aria-live="assertive">
            {visible ?? ''}
          </p>
        ) : (
          <>
            <p className="text-app-muted">
              {t(mode === 'forward' ? 'numberspan.type' : 'numberspan.typeBack')}
            </p>
            <p className="mt-3 min-h-[3.5rem] font-mono text-4xl font-bold tracking-[0.3em] text-brand">
              {typed.padEnd(seq.length, '·')}
            </p>
          </>
        )}
      </div>
      <NumPad
        onDigit={onDigit}
        onBackspace={() => setTyped((s) => s.slice(0, -1))}
        disabled={showing}
      />
    </div>
  );
}

export default function NumberSpanExercise(props: GameProps) {
  const t = useT();
  const [mode, setMode] = useState<Mode>('forward');
  return (
    <ExerciseShell
      {...props}
      activityId="numberspan"
      emoji="🔢"
      instructions={[t('numberspan.i1'), t('numberspan.i2'), t('numberspan.i3')]}
      variants={[
        { id: 'forward', label: t('numberspan.forward') },
        { id: 'backward', label: t('numberspan.backward') },
      ]}
      variant={mode}
      onVariant={(id) => setMode(id as Mode)}
    >
      {(run) => <Run {...run} mode={mode} />}
    </ExerciseShell>
  );
}
