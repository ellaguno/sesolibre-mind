import type { Lang } from '../../core/i18n';
import { themesFor } from '../../words/themes';
import { generateWordMaze, type Variant } from './generator';

// 7×7 difícil puede tardar algo en móvil: fuera del hilo principal.
self.onmessage = (e: MessageEvent<{ seed: number; variant: Variant; lang: Lang }>) => {
  const { seed, variant, lang } = e.data;
  self.postMessage({ result: generateWordMaze(seed, variant, themesFor(lang)) });
};
