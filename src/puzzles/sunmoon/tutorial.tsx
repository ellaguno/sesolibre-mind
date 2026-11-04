import type { TFn } from '../../core/i18n';
import MiniBoard from '../../ui/MiniBoard';
import type { Slide } from '../../ui/Tutorial';

const S = '☀️';
const M = '🌙';
// 4×4 válido: 2 y 2 por fila y columna, sin tres iguales seguidos.
const SOLVED = [S, M, S, M, M, S, M, S, S, S, M, M, M, M, S, S];

export function sunmoonSlides(t: TFn): Slide[] {
  return [
    {
      title: t('tut.sunmoon.1.title'),
      body: t('tut.sunmoon.1.body'),
      art: (
        <MiniBoard
          cols={4}
          rows={4}
          texts={Object.fromEntries(SOLVED.map((v, i) => [i, v]))}
          badge="ok"
          label={t('tut.sunmoon.1.title')}
        />
      ),
    },
    {
      title: t('tut.sunmoon.2.title'),
      body: t('tut.sunmoon.2.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={1}
          texts={{ 0: S, 1: S, 2: S }}
          highlight={[0, 1, 2]}
          badge="bad"
          label={t('tut.sunmoon.2.title')}
        />
      ),
    },
    {
      title: t('tut.sunmoon.3.title'),
      body: t('tut.sunmoon.3.body'),
      art: (
        <MiniBoard
          cols={2}
          rows={2}
          texts={{ 0: S, 1: S, 2: M, 3: S }}
          signs={[
            { a: 0, b: 1, kind: 'eq' },
            { a: 2, b: 3, kind: 'neq' },
          ]}
          badge="ok"
          label={t('tut.sunmoon.3.title')}
        />
      ),
    },
  ];
}
