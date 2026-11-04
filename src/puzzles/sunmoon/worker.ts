import { generateSunMoon, type Difficulty } from './generator';

self.onmessage = (
  e: MessageEvent<{ seed: number; size: number; difficulty: Difficulty }>,
) => {
  const { seed, size, difficulty } = e.data;
  self.postMessage({ result: generateSunMoon(seed, size, difficulty) });
};
