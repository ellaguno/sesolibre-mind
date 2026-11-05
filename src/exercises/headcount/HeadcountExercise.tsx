import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../core/registry';
import { useT } from '../../core/i18n';
import { AudioService } from '../../core/AudioService';
import { mulberry32 } from '../../core/rng';
import { SERENE_SLOWDOWN, useSettings } from '../../core/settings';

import ExerciseShell, { type RunProps } from '../common/ExerciseShell';
import NumPad from '../common/NumPad';
import { LEVELS, passed, rounds, type Level } from './logic';
import { useActivityLevel } from '../../core/levels';
import { levelOptions } from '../common/levelOptions';

type Stage = 'ready' | 'moving' | 'ask' | 'feedback';

function Run({ seed, finish, lv }: RunProps & { lv: Level }) {
  const t = useT();
  const list = useMemo(() => rounds(mulberry32(seed), lv), [seed, lv]);
  const ROUNDS = list.length;
  const [r, setR] = useState(0);
  const [stage, setStage] = useState<Stage>('ready');
  const [move, setMove] = useState(0);
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const [lastOk, setLastOk] = useState(false);
  // Modo sereno: la gente camina más despacio.
  const serene = useSettings((s) => s.serene);
  const slow = serene ? SERENE_SLOWDOWN : 1;
  const round = list[r];
  const stepMs = Math.round(round.stepMs * slow);

  useEffect(() => {
    if (stage === 'ready') {
      const id = setTimeout(() => {
        setMove(0);
        setStage('moving');
      }, 1100);
      return () => clearTimeout(id);
    }
    if (stage === 'moving') {
      const id = setTimeout(() => {
        if (move + 1 < round.moves.length) setMove(move + 1);
        else setStage('ask');
      }, stepMs);
      return () => clearTimeout(id);
    }
    if (stage === 'feedback') {
      const id = setTimeout(() => {
        if (r + 1 === ROUNDS) return;
        setR(r + 1);
        setTyped('');
        setStage('ready');
      }, 1400);
      return () => clearTimeout(id);
    }
  }, [stage, move, round, r, ROUNDS, stepMs]);

  const submit = () => {
    if (stage !== 'ask' || typed === '') return;
    const ok = Number(typed) === round.answer;
    AudioService.play(ok ? 'correct' : 'wrong');
    const s = score + (ok ? 1 : 0);
    setScore(s);
    setLastOk(ok);
    setStage('feedback');
    if (r + 1 === ROUNDS) {
      setTimeout(
        () =>
          finish({
            score: s,
            headline: `${s}/${ROUNDS}`,
            detail: t('headcount.detail'),
            passed: passed(s, lv),
          }),
        1400,
      );
    }
  };

  const m = round.moves[move];
  const walkStyle = {
    '--walk-ms': `${Math.round(stepMs * 0.9)}ms`,
  } as CSSProperties;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-between text-sm text-app-muted">
        <span>{t('headcount.round', { n: r + 1, total: ROUNDS })}</span>
        <span>{t('headcount.score', { n: score })}</span>
      </div>
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 to-green-200">
        <span className="z-10 text-[6rem] leading-none" aria-hidden>
          🏠
        </span>
        {stage === 'moving' && (
          <div
            key={`${r}-${move}`}
            aria-hidden
            className={`absolute bottom-6 flex gap-0.5 text-4xl ${m.dir === 'in' ? 'walk-in' : 'walk-out'}`}
            style={walkStyle}
          >
            {Array.from({ length: m.n }, (_, k) => (
              // 🚶 mira a la izquierda: se voltea para que camine hacia la derecha.
              <span key={k} className="inline-block -scale-x-100">
                🚶
              </span>
            ))}
          </div>
        )}
        {stage === 'ready' && (
          <p className="absolute top-3 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-slate-800">
            {r === 0 ? t('headcount.empty') : t('headcount.watch')}
          </p>
        )}
        {stage === 'feedback' && (
          <p
            className={`overlay-pop absolute top-3 rounded-full px-3 py-1 text-sm font-bold text-white ${
              lastOk ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {lastOk ? t('headcount.right') : t('headcount.wrong', { n: round.answer })}
          </p>
        )}
      </div>
      <div className="flex min-h-[4rem] flex-col items-center justify-center text-center">
        {stage === 'ask' || stage === 'feedback' ? (
          <>
            <p className="text-app-muted">{t('headcount.question')}</p>
            <p className="text-4xl font-bold text-brand tabular-nums">{typed || '?'}</p>
          </>
        ) : (
          <p className="text-app-muted" aria-live="polite">
            {t('headcount.counting')}
          </p>
        )}
      </div>
      <NumPad
        onDigit={(d) => setTyped((s) => (s + d).slice(0, 2))}
        onBackspace={() => setTyped((s) => s.slice(0, -1))}
        onSubmit={submit}
        disabled={stage !== 'ask'}
      />
    </div>
  );
}

export default function HeadcountExercise(props: GameProps) {
  const t = useT();
  const [level, setLevel] = useActivityLevel(
    'headcount',
    props.daily || !!props.inSession,
    props.challenge?.level,
  );
  const lv = LEVELS[level] ?? LEVELS['3'];
  return (
    <ExerciseShell
      {...props}
      activityId="headcount"
      emoji="🏠"
      instructions={[
        lv.onlyIn ? t('headcount.i1easy') : t('headcount.i1'),
        t('headcount.i2'),
        t('headcount.i3', { n: lv.rounds }),
      ]}
      variants={levelOptions('headcount', t)}
      variant={level}
      onVariant={setLevel}
    >
      {(run) => <Run {...run} lv={lv} />}
    </ExerciseShell>
  );
}
