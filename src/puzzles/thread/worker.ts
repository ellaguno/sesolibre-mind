import { generateThread, type Variant } from './generator';

// 8×8 difícil puede tardar ~0,5 s (más en móvil): fuera del hilo principal.
self.onmessage = (e: MessageEvent<{ seed: number; variant: Variant }>) => {
  self.postMessage({ result: generateThread(e.data.seed, e.data.variant) });
};
