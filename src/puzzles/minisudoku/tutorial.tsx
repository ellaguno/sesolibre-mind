import type { TFn } from '../../core/i18n';
import MiniBoard from '../../ui/MiniBoard';
import type { Slide } from '../../ui/Tutorial';

export function minisudokuSlides(t: TFn): Slide[] {
  return [
    {
      title: t('tut.minisudoku.1.title'),
      body: t('tut.minisudoku.1.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={2}
          texts={{ 0: '4', 1: '1', 2: '6', 3: '2', 4: '5', 5: '3' }}
          badge="ok"
          label={t('tut.minisudoku.1.title')}
        />
      ),
    },
    {
      title: t('tut.minisudoku.2.title'),
      body: t('tut.minisudoku.2.body'),
      art: (
        <MiniBoard
          cols={6}
          rows={1}
          texts={{ 0: '1', 1: '3', 2: '5', 3: '3', 4: '2', 5: '6' }}
          highlight={[1, 3]}
          badge="bad"
          label={t('tut.minisudoku.2.title')}
        />
      ),
    },
    {
      title: t('tut.minisudoku.3.title'),
      body: t('tut.minisudoku.3.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={1}
          fills={{ 1: '#c7d2fe' }}
          texts={{ 0: '2', 1: '?', 2: '✏️' }}
          label={t('tut.minisudoku.3.title')}
        />
      ),
    },
  ];
}
