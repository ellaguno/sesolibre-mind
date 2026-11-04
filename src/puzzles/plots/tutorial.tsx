import type { TFn } from '../../core/i18n';
import MiniBoard from '../../ui/MiniBoard';
import type { Slide } from '../../ui/Tutorial';

export function plotsSlides(t: TFn): Slide[] {
  return [
    {
      title: t('tut.plots.1.title'),
      body: t('tut.plots.1.body'),
      art: (
        <MiniBoard
          cols={4}
          rows={4}
          rects={[
            { r: 0, c: 0, h: 2, w: 2, fill: '#fca5a5' },
            { r: 0, c: 2, h: 1, w: 2, fill: '#93c5fd' },
            { r: 1, c: 2, h: 3, w: 2, fill: '#86efac' },
            { r: 2, c: 0, h: 2, w: 2, fill: '#fde68a' },
          ]}
          texts={{ 0: '4', 2: '2', 11: '6', 13: '4' }}
          badge="ok"
          label={t('tut.plots.1.title')}
        />
      ),
    },
    {
      title: t('tut.plots.2.title'),
      body: t('tut.plots.2.body'),
      art: (
        <MiniBoard
          cols={5}
          rows={2}
          rects={[
            { r: 0, c: 0, h: 2, w: 2, fill: '#c4b5fd' },
            { r: 0, c: 2, h: 2, w: 1, fill: '#fdba74' },
            { r: 0, c: 3, h: 1, w: 2, fill: '#5eead4' },
            { r: 1, c: 3, h: 1, w: 2, fill: '#f9a8d4' },
          ]}
          texts={{ 0: '4', 2: '2', 3: '2', 9: '2' }}
          badge="ok"
          label={t('tut.plots.2.title')}
        />
      ),
    },
    {
      title: t('tut.plots.3.title'),
      body: t('tut.plots.3.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          rects={[
            { r: 0, c: 0, h: 2, w: 3, fill: 'rgba(99,102,241,0.15)', dashed: true },
          ]}
          texts={{ 1: '6' }}
          label={t('tut.plots.3.title')}
        />
      ),
    },
  ];
}
