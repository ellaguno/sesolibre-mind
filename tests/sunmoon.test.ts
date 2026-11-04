import { describe, it, expect } from 'vitest';
import {
  EMPTY,
  MOON,
  SUN,
  countSolutions,
  hint,
  isSolved,
  lineCells,
  nextDeduction,
  solveByLogic,
  violations,
  type Cell,
  type SunMoonPuzzle,
} from '../src/puzzles/sunmoon/logic';
import {
  VARIANTS,
  dailyVariant,
  generateSunMoon,
} from '../src/puzzles/sunmoon/generator';

const empty = (size: number): SunMoonPuzzle => ({
  size,
  givens: new Array<Cell>(size * size).fill(EMPTY),
  edges: [],
});

describe('sol y luna · reglas', () => {
  it('detecta tres iguales seguidos', () => {
    const p = empty(6);
    const s = [...p.givens];
    s[0] = s[1] = s[2] = SUN;
    expect([...violations(p, s).cells].sort()).toEqual([0, 1, 2]);
    s[2] = MOON;
    expect(violations(p, s).cells.size).toBe(0);
  });

  it('detecta exceso de un tipo en una columna', () => {
    const p = empty(6);
    const s = [...p.givens];
    for (const i of [0, 12, 24, 30]) s[i] = MOON; // columna 0, sin 3 seguidos
    s[6] = SUN;
    s[18] = SUN;
    expect(violations(p, s).cells.has(0)).toBe(true);
  });

  it('detecta pistas = y × incumplidas', () => {
    const p: SunMoonPuzzle = {
      ...empty(6),
      edges: [
        { a: 0, b: 1, kind: 'eq' },
        { a: 6, b: 12, kind: 'neq' },
      ],
    };
    const s = [...p.givens];
    s[0] = SUN;
    s[1] = MOON;
    s[6] = SUN;
    s[12] = SUN;
    expect([...violations(p, s).edges].sort()).toEqual([0, 1]);
  });
});

describe('sol y luna · generador', () => {
  for (const v of VARIANTS) {
    it(`variante ${v.id}: única, resoluble por lógica y coherente`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const { puzzle, solution } = generateSunMoon(
          seed * 977 + v.size,
          v.size,
          v.difficulty,
        );
        expect(isSolved(puzzle, solution)).toBe(true);
        expect(countSolutions(puzzle, 2)).toBe(1);
        expect(solveByLogic(puzzle)).toEqual(solution);
        puzzle.givens.forEach((g, i) => g !== EMPTY && expect(g).toBe(solution[i]));
        for (const e of puzzle.edges) {
          expect(e.kind === 'eq').toBe(solution[e.a] === solution[e.b]);
        }
        // Cada fila con mitad y mitad.
        for (let r = 0; r < v.size; r++) {
          const row = lineCells(v.size, 'row', r).map((i) => solution[i]);
          expect(row.filter((x) => x === SUN)).toHaveLength(v.size / 2);
        }
      }
    });
  }

  it('fácil da más pistas que difícil', () => {
    const clues = (d: 'easy' | 'hard') => {
      let n = 0;
      for (let s = 1; s <= 10; s++) {
        const { puzzle } = generateSunMoon(s, 6, d);
        n += puzzle.givens.filter((g) => g !== EMPTY).length + puzzle.edges.length;
      }
      return n;
    };
    expect(clues('easy')).toBeGreaterThan(clues('hard'));
  });

  it('es determinista', () => {
    expect(generateSunMoon(5, 6)).toEqual(generateSunMoon(5, 6));
    expect(generateSunMoon(5, 6)).not.toEqual(generateSunMoon(6, 6));
  });

  it('el reto diario usa una variante conocida', () => {
    for (let d = 0; d < 7; d++) {
      const date = new Date(2026, 10, 1 + d);
      expect(VARIANTS.map((v) => v.id)).toContain(dailyVariant(date).id);
    }
  });
});

describe('sol y luna · pista', () => {
  const { puzzle, solution } = generateSunMoon(77, 6, 'hard');

  it('corrige primero una celda equivocada', () => {
    const s = [...puzzle.givens];
    const i = s.findIndex((v) => v === EMPTY);
    s[i] = solution[i] === SUN ? MOON : SUN;
    expect(hint(puzzle, solution, s)).toEqual({ kind: 'wrong', cell: i });
  });

  it('si no hay errores, da una deducción correcta con su línea', () => {
    const h = hint(puzzle, solution, puzzle.givens);
    expect(h?.kind).toBe('place');
    if (h?.kind === 'place') {
      expect(h.value).toBe(solution[h.cell]);
      expect(h.line).not.toBeNull();
    }
  });

  it('las deducciones encadenadas resuelven el tablero', () => {
    const s = [...puzzle.givens];
    for (let k = 0; k < 36; k++) {
      const d = nextDeduction(puzzle, s);
      if (!d) break;
      s[d.cell] = d.value;
    }
    expect(s).toEqual(solution);
  });
});
