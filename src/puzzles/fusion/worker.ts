import { generateFusion } from './logic';

self.onmessage = (e: MessageEvent<{ seed: number; variant: string }>) => {
  self.postMessage({ result: generateFusion(e.data.seed, e.data.variant) });
};
