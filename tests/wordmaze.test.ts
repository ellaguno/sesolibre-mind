import { describe, it, expect } from 'vitest';
import { VARIANTS, generateWordMaze } from '../src/puzzles/wordmaze/generator';
import { checkTrace, nextHint, solve, wallSet } from '../src/puzzles/wordmaze/logic';
import { toGridLetters } from '../src/words/normalize';
import type { Theme } from '../src/words/types';
import { THEMES_ES } from '../src/words/data/es';
import { THEMES_EN } from '../src/words/data/en';

const SAMPLE: Theme[] = [
  {
    id: 'frutas',
    name: 'Frutas',
    words: [
      'kiwi',
      'piña',
      'pera',
      'uva',
      'limón',
      'mango',
      'fresa',
      'melón',
      'cereza',
      'banana',
      'sandía',
      'durazno',
      'naranja',
      'ciruela',
      'guayaba',
      'papaya',
      'coco',
      'lima',
      'higo',
      'mora',
      'nuez',
      'dátil',
      'membrillo',
      'toronja',
    ].map((w) => ({ w, c: '' })),
  },
];

describe('toGridLetters', () => {
  it('quita acentos y conserva la Ñ', () => {
    expect(toGridLetters('limón')).toEqual(['L', 'I', 'M', 'O', 'N']);
    expect(toGridLetters('piña')).toEqual(['P', 'I', 'Ñ', 'A']);
    expect(toGridLetters('pingüino').join('')).toBe('PINGUINO');
  });
});

describe('wordmaze generator', () => {
  for (const v of VARIANTS) {
    it(`genera ${v.id}×${v.id} con solución única que cubre el tablero`, () => {
      for (const seed of [1, 2, 3]) {
        const g = generateWordMaze(seed, v, SAMPLE);
        const { size, letters, words } = g.puzzle;
        expect(letters).toHaveLength(size * size);
        expect(words.reduce((s, w) => s + w.length, 0)).toBe(size * size);
        expect(words.length).toBeGreaterThanOrEqual(v.words[0]);
        expect(words.length).toBeLessThanOrEqual(v.words[1]);
        const cells = g.solution.flat().sort((a, b) => a - b);
        expect(cells).toEqual([...Array(size * size).keys()]);
        const sols = solve(size, letters, wallSet(g.puzzle.walls), words, 2);
        expect(sols).toHaveLength(1);
      }
    });
  }

  it('es determinista por semilla', () => {
    const a = generateWordMaze(7, VARIANTS[1], SAMPLE);
    const b = generateWordMaze(7, VARIANTS[1], SAMPLE);
    expect(a).toEqual(b);
  });
});

describe('checkTrace y pistas', () => {
  const g = generateWordMaze(11, VARIANTS[1], SAMPLE);

  it('acepta el recorrido correcto y rechaza letras al azar', () => {
    expect(checkTrace(g, [], g.solution[0])).toEqual({ kind: 'found', word: 0 });
    expect(checkTrace(g, [0], g.solution[0]).kind).not.toBe('found');
    expect(checkTrace(g, [], [g.solution[0][0]]).kind).toBe('none');
  });

  it('la pista avanza letra a letra en la misma palabra', () => {
    const h1 = nextHint(g, [], {});
    expect(h1?.letters).toBe(1);
    const h2 = nextHint(g, [], { [h1!.word]: 1 });
    expect(h2).toEqual({ word: h1!.word, letters: 2 });
    expect(
      nextHint(
        g,
        g.puzzle.words.map((_, k) => k),
        {},
      ),
    ).toBeNull();
  });
});

describe('datos de palabras', () => {
  for (const [lang, themes] of [
    ['es', THEMES_ES],
    ['en', THEMES_EN],
  ] as const) {
    it(`${lang}: cada tema genera todos los niveles`, () => {
      for (const theme of themes)
        for (const v of VARIANTS) {
          const g = generateWordMaze(3, v, [theme]);
          expect(g.puzzle.theme).toBe(theme.name);
        }
    });
    it(`${lang}: palabras de 3 a 8 letras sin espacios`, () => {
      for (const t of themes)
        for (const e of t.words) {
          const l = toGridLetters(e.w);
          expect(l.length).toBeGreaterThanOrEqual(3);
          expect(l.length).toBeLessThanOrEqual(8);
          expect(l.join('')).toMatch(/^[A-ZÑ]+$/);
        }
    });
  }
});
