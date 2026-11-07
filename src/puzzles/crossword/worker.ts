import type { Lang } from '../../core/i18n';
import { themesFor } from '../../words/themes';
import { generateCrossword, type Variant } from './generator';

self.onmessage = (e: MessageEvent<{ seed: number; variant: Variant; lang: Lang }>) => {
  const { seed, variant, lang } = e.data;
  self.postMessage({ result: generateCrossword(seed, variant, themesFor(lang)) });
};
