import type { Lang, TFn } from '../../core/i18n';
import MiniBoard from '../../ui/MiniBoard';
import type { Slide } from '../../ui/Tutorial';

// Cruz de 3×3: una horizontal en la fila del medio y una vertical en la
// columna del medio que comparten la letra central.
const ACROSS = [3, 4, 5];
const DOWN = [1, 4, 7];
const WORDS: Record<Lang, [string, string]> = {
  es: ['MAR', 'PAN'],
  en: ['CAT', 'HAT'],
};
const BLANK = '#e2e8f0';

function texts(lang: Lang): Record<number, string> {
  const [a, d] = WORDS[lang];
  const out: Record<number, string> = {};
  ACROSS.forEach((c, k) => (out[c] = a[k]));
  DOWN.forEach((c, k) => (out[c] = d[k]));
  return out;
}

const blanks = { 0: BLANK, 2: BLANK, 6: BLANK, 8: BLANK };

export function crosswordSlides(t: TFn, lang: Lang): Slide[] {
  return [
    {
      title: t('tut.crossword.1.title'),
      body: t('tut.crossword.1.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          texts={texts(lang)}
          fills={{ ...blanks, 3: '#c7d2fe', 4: '#fcd34d', 5: '#c7d2fe' }}
          label={t('tut.crossword.1.title')}
        />
      ),
    },
    {
      title: t('tut.crossword.2.title'),
      body: t('tut.crossword.2.body'),
      art: (
        <MiniBoard
          cols={3}
          rows={3}
          texts={texts(lang)}
          fills={{ ...blanks, 1: '#c7d2fe', 4: '#fcd34d', 7: '#c7d2fe' }}
          badge="ok"
          label={t('tut.crossword.2.title')}
        />
      ),
    },
  ];
}
