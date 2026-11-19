import type { TFn } from '../../core/i18n';
import MiniBoard from '../../ui/MiniBoard';
import type { Slide } from '../../ui/Tutorial';

const SKY = '#7dd3fc';
const GREEN = '#86efac';
const AMBER = '#fde047';

export function fusionSlides(t: TFn): Slide[] {
  return [
    {
      title: t('tut.fusion.1.title'),
      body: t('tut.fusion.1.body'),
      art: (
        <MiniBoard
          cols={4}
          rows={1}
          fills={{ 0: SKY, 1: SKY, 3: GREEN }}
          texts={{ 0: '1', 1: '1', 2: '→', 3: '2' }}
          highlight={[0, 1]}
          label={t('tut.fusion.1.title')}
        />
      ),
    },
    {
      title: t('tut.fusion.2.title'),
      body: t('tut.fusion.2.body'),
      art: (
        <MiniBoard
          cols={2}
          rows={2}
          fills={{ 0: GREEN, 3: GREEN, 1: AMBER }}
          texts={{ 0: '2', 3: '2', 1: '4' }}
          badge="bad"
          label={t('tut.fusion.2.title')}
        />
      ),
    },
    {
      title: t('tut.fusion.3.title'),
      body: t('tut.fusion.3.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={1}
          fills={{ 1: '#fdba74' }}
          texts={{ 1: '8' }}
          badge="ok"
          label={t('tut.fusion.3.title')}
        />
      ),
    },
  ];
}
