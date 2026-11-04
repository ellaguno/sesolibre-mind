import type { TFn } from '../../core/i18n';
import MiniBoard from '../../ui/MiniBoard';
import type { Slide } from '../../ui/Tutorial';

// 4×4 resuelto: coronas en (0,1) (1,3) (2,0) (3,2), una por zona.
const REGIONS = [0, 0, 0, 1, 0, 2, 2, 1, 2, 2, 3, 1, 3, 3, 3, 1];
const COLORS = ['#c4b5fd', '#fdba74', '#93c5fd', '#86efac'];
const fills = Object.fromEntries(REGIONS.map((r, i) => [i, COLORS[r]]));

export function crownsSlides(t: TFn): Slide[] {
  return [
    {
      title: t('tut.crowns.1.title'),
      body: t('tut.crowns.1.body'),
      art: (
        <MiniBoard
          cols={4}
          rows={4}
          fills={fills}
          regions={REGIONS}
          texts={{ 1: '👑', 7: '👑', 8: '👑', 14: '👑' }}
          badge="ok"
          label={t('tut.crowns.1.title')}
        />
      ),
    },
    {
      title: t('tut.crowns.2.title'),
      body: t('tut.crowns.2.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          texts={{ 0: '👑', 4: '👑' }}
          highlight={[0, 4]}
          badge="bad"
          label={t('tut.crowns.2.title')}
        />
      ),
    },
    {
      title: t('tut.crowns.3.title'),
      body: t('tut.crowns.3.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={1}
          texts={{ 1: '✕', 2: '👑' }}
          label={t('tut.crowns.3.title')}
        />
      ),
    },
  ];
}
