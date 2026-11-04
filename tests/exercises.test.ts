import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/core/rng';
import * as qm from '../src/exercises/quickmath/logic';
import * as cc from '../src/exercises/colorclash/logic';
import * as cd from '../src/exercises/countdown/logic';
import * as ns from '../src/exercises/numberspan/logic';
import * as tr from '../src/exercises/trails/logic';
import * as hc from '../src/exercises/headcount/logic';

describe('cálculo relámpago', () => {
  it('genera operaciones correctas de resultado entero y positivo', () => {
    const ps = qm.problems(mulberry32(1), 200);
    for (const p of ps) {
      const v = { '+': p.a + p.b, '−': p.a - p.b, '×': p.a * p.b, '÷': p.a / p.b }[p.op];
      expect(v).toBe(p.answer);
      expect(Number.isInteger(p.answer) && p.answer > 0).toBe(true);
    }
    expect(new Set(ps.map((p) => p.op)).size).toBe(4);
  });

  it('check distingue correcto, pendiente y erróneo', () => {
    const p = { a: 6, b: 7, op: '×' as const, answer: 42 };
    expect(qm.check(p, '4')).toBe('pending');
    expect(qm.check(p, '42')).toBe('correct');
    expect(qm.check(p, '43')).toBe('wrong');
  });

  it('es determinista y penaliza errores', () => {
    expect(qm.problems(mulberry32(5))).toEqual(qm.problems(mulberry32(5)));
    expect(qm.score(30_000, 2)).toBe(40);
  });
});

describe('choque de colores', () => {
  it('mezcla ensayos congruentes e incongruentes', () => {
    const ts = cc.trials(mulberry32(2), 400);
    const congruent = ts.filter((t) => t.word === t.ink).length / ts.length;
    expect(congruent).toBeGreaterThan(0.1);
    expect(congruent).toBeLessThan(0.45);
  });
});

describe('cuenta atrás', () => {
  it('el inicio no es múltiplo del paso y da para muchas restas', () => {
    for (let s = 0; s < 50; s++) {
      for (const step of cd.STEPS) {
        const v = cd.startValue(mulberry32(s), step);
        expect(v % step).not.toBe(0);
        expect(v).toBeGreaterThanOrEqual(80);
      }
    }
    expect(cd.canContinue(6, 7)).toBe(false);
  });
});

describe('retén la cifra', () => {
  it('series sin cifras repetidas seguidas y respuesta según el modo', () => {
    const seq = ns.sequence(mulberry32(3), 10);
    expect(seq).toHaveLength(10);
    seq.slice(1).forEach((d, i) => expect(d).not.toBe(seq[i]));
    expect(ns.expected([1, 2, 3], 'forward')).toBe('123');
    expect(ns.expected([1, 2, 3], 'backward')).toBe('321');
  });
});

describe('sendero', () => {
  it('etiquetas en orden para A y B', () => {
    expect(tr.labels('A', 4)).toEqual(['1', '2', '3', '4']);
    expect(tr.labels('B', 5)).toEqual(['1', 'A', '2', 'B', '3']);
  });

  it('círculos separados y dentro del tablero', () => {
    const pts = tr.positions(mulberry32(4));
    expect(pts).toHaveLength(tr.ITEMS);
    for (const p of pts) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
    }
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(
          0.18,
        );
  });
});

describe('¿cuántos quedan?', () => {
  it('nunca sale más gente de la que hay y la respuesta cuadra', () => {
    for (let s = 0; s < 30; s++) {
      for (const r of hc.rounds(mulberry32(s))) {
        let inside = 0;
        for (const m of r.moves) {
          inside += m.dir === 'in' ? m.n : -m.n;
          expect(inside).toBeGreaterThanOrEqual(0);
        }
        expect(inside).toBe(r.answer);
      }
    }
  });

  it('las rondas se aceleran', () => {
    const rs = hc.rounds(mulberry32(1));
    expect(rs[4].stepMs).toBeLessThan(rs[0].stepMs);
    expect(rs[4].moves.length).toBeGreaterThan(rs[0].moves.length);
  });
});

describe('choque de colores · modo daltónico', () => {
  it('usa sólo las tintas seguras para daltonismo', () => {
    const ts = cc.trials(mulberry32(9), 200, cc.COLORS_CB);
    const used = new Set(ts.flatMap((t) => [t.word, t.ink]));
    expect([...used].sort()).toEqual([...cc.COLORS_CB].sort());
  });
});
