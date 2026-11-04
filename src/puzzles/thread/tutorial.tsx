import type { TFn } from '../../core/i18n';
import MiniBoard from '../../ui/MiniBoard';
import type { Slide } from '../../ui/Tutorial';

const ZIGZAG = [0, 1, 2, 5, 4, 3, 6, 7, 8];

export function threadSlides(t: TFn): Slide[] {
  return [
    {
      title: t('tut.thread.1.title'),
      body: t('tut.thread.1.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          path={ZIGZAG}
          dots={{ 0: '1', 4: '2', 8: '3' }}
          badge="ok"
          label={t('tut.thread.1.title')}
        />
      ),
    },
    {
      title: t('tut.thread.2.title'),
      body: t('tut.thread.2.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          path={[0, 1, 2, 5, 8]}
          dots={{ 0: '1', 4: '2', 8: '3' }}
          highlight={[8]}
          badge="bad"
          label={t('tut.thread.2.title')}
        />
      ),
    },
    {
      title: t('tut.thread.3.title'),
      body: t('tut.thread.3.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          path={ZIGZAG}
          dots={{ 0: '1', 8: '2' }}
          walls={[
            [1, 4],
            [4, 7],
          ]}
          badge="ok"
          label={t('tut.thread.3.title')}
        />
      ),
    },
  ];
}
