import { generateSudoku, type Difficulty } from './generator';

self.onmessage = (
  e: MessageEvent<{ seed: number; difficulty: Difficulty; size: 4 | 6 }>,
) => {
  self.postMessage({
    result: generateSudoku(e.data.seed, e.data.difficulty, e.data.size),
  });
};
