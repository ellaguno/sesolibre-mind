import { useEffect, useState } from 'react';

/**
 * Ejecuta un cálculo pesado (generar un tablero) en un Web Worker y devuelve el
 * resultado, o null mientras se calcula. Sin soporte de Worker (p. ej. en
 * tests) lo calcula en línea con `fallback`.
 *
 * Protocolo del worker: recibe `args` y responde `{ result }`.
 * `key` identifica la petición: al cambiar se descarta la anterior.
 */
export function useWorkerResult<A, T>(
  key: string,
  makeWorker: () => Worker,
  args: A,
  fallback: (args: A) => T,
): T | null {
  const [data, setData] = useState<{ key: string; value: T } | null>(null);
  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setData({ key, value: fallback(args) });
      return;
    }
    const worker = makeWorker();
    worker.onmessage = (e: MessageEvent<{ result: T }>) =>
      setData({ key, value: e.data.result });
    worker.postMessage(args);
    return () => worker.terminate();
    // `key` resume `args`; makeWorker/fallback son estables por módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data?.key === key ? data.value : null;
}
