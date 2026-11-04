import { useEffect, useRef, useState } from 'react';

/** Cronómetro que arranca al montar. `ms()` da el tiempo exacto; `elapsed`, segundos para mostrar. */
export function useStopwatch(running = true) {
  const start = useRef(performance.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setElapsed(Math.floor((performance.now() - start.current) / 1000)),
      250,
    );
    return () => clearInterval(id);
  }, [running]);
  return { elapsed, ms: () => performance.now() - start.current };
}
