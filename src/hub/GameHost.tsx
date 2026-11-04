import { Suspense, lazy, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { findActivity } from '../core/registry';
import { recordResult } from '../core/play';
import { dailySeed, dateKey, randomSeed } from '../core/rng';
import GamePlaceholder from './GamePlaceholder';

/** Monta una actividad: `#/play/<id>` (libre) o `#/play/<id>?daily=1` (reto del día). */
export default function GameHost() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const activity = findActivity(id);
  const daily = search.get('daily') === '1';

  const Lazy = useMemo(
    () => (activity?.load ? lazy(activity.load) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activity?.id],
  );
  // Semilla fija durante la vida de la pantalla (el reto diario, la del día).
  const seed = useMemo(
    () => (daily && id ? dailySeed(dateKey(new Date()), id) : randomSeed()),
    [daily, id],
  );

  // Callbacks estables: las actividades los tienen en dependencias de efectos.
  const onScore = useCallback(
    (score: number, meta?: Record<string, unknown>) => {
      if (id) recordResult(id, score, meta, daily);
    },
    [id, daily],
  );
  const onExit = useCallback(() => navigate('/'), [navigate]);

  if (!activity || !activity.available || !Lazy) return <GamePlaceholder />;

  return (
    <div className="relative min-h-full">
      <Suspense
        fallback={
          <div className="flex min-h-full items-center justify-center text-app-muted">
            …
          </div>
        }
      >
        {/* key: pasar de práctica a reto del día (misma ruta) debe empezar de cero. */}
        <Lazy
          key={`${activity.id}:${daily}`}
          onScore={onScore}
          onExit={onExit}
          seed={seed}
          daily={daily}
        />
      </Suspense>
    </div>
  );
}
