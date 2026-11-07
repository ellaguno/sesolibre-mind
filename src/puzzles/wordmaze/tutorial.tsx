import type { Lang, TFn } from '../../core/i18n';
import MiniBoard from '../../ui/MiniBoard';
import type { Slide } from '../../ui/Tutorial';

// 3×3 con tres palabras de 3 letras que doblan esquinas:
// la 1.ª en [0,3,4], la 2.ª en [1,2,5] y la 3.ª en [6,7,8].
const CELLS = [
  [0, 3, 4],
  [1, 2, 5],
  [6, 7, 8],
];
const WORDS: Record<Lang, string[]> = {
  es: ['SOL', 'MAR', 'LUZ'],
  en: ['SUN', 'SEA', 'SKY'],
};

function letters(lang: Lang): Record<number, string> {
  const out: Record<number, string> = {};
  CELLS.forEach((cells, k) => cells.forEach((c, j) => (out[c] = WORDS[lang][k][j])));
  return out;
}

export function wordMazeSlides(t: TFn, lang: Lang): Slide[] {
  const texts = letters(lang);
  return [
    {
      title: t('tut.wordmaze.1.title'),
      body: t('tut.wordmaze.1.body', { word: WORDS[lang][0] }),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          texts={texts}
          path={CELLS[0]}
          badge="ok"
          label={t('tut.wordmaze.1.title')}
        />
      ),
    },
    {
      title: t('tut.wordmaze.2.title'),
      body: t('tut.wordmaze.2.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          texts={texts}
          walls={[
            [3, 6],
            [4, 7],
            [4, 5],
          ]}
          path={[4, 7]}
          badge="bad"
          label={t('tut.wordmaze.2.title')}
        />
      ),
    },
    {
      title: t('tut.wordmaze.3.title'),
      body: t('tut.wordmaze.3.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          texts={texts}
          fills={{
            0: '#c7d2fe',
            3: '#c7d2fe',
            4: '#c7d2fe',
            1: '#bbf7d0',
            2: '#bbf7d0',
            5: '#bbf7d0',
            6: '#fde68a',
            7: '#fde68a',
            8: '#fde68a',
          }}
          badge="ok"
          label={t('tut.wordmaze.3.title')}
        />
      ),
    },
  ];
}
