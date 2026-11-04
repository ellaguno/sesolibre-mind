import { generateSudoku, type Difficulty } from './generator';

self.onmessage = (e: MessageEvent<{ seed: number; difficulty: Difficulty }>) => {
  self.postMessage({ result: generateSudoku(e.data.seed, e.data.difficulty) });
};
