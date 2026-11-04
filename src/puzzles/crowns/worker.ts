import { generateCrowns } from './generator';

// Genera fuera del hilo principal: los tableros grandes pueden tardar cientos
// de ms en un móvil y congelarían la interfaz.
self.onmessage = (e: MessageEvent<{ id: number; seed: number; size: number }>) => {
  const { id, seed, size } = e.data;
  self.postMessage({ id, result: generateCrowns(seed, size) });
};
