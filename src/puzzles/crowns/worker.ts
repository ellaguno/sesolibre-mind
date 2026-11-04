import { generateCrowns } from './generator';

// Genera fuera del hilo principal: los tableros grandes pueden tardar cientos
// de ms en un móvil y congelarían la interfaz.
self.onmessage = (e: MessageEvent<{ seed: number; size: number }>) => {
  self.postMessage({ result: generateCrowns(e.data.seed, e.data.size) });
};
