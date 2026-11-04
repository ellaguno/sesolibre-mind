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
    const ps = qm.problems(mulberry32(1), { ...qm.LEVELS['4'], count: 200 });
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
      for (const lv of [cd.LEVELS['3'], cd.LEVELS['7']]) {
        const v = cd.startValue(mulberry32(s), lv);
        expect(v % lv.step).not.toBe(0);
        expect(v).toBeGreaterThanOrEqual(80);
      }
      // Paso 1 (nivel básico): cualquier inicio vale.
      expect(cd.startValue(mulberry32(s), cd.LEVELS['1'])).toBeLessThanOrEqual(25);
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

describe('ejercicios · niveles', () => {
  it('cálculo nivel 1: 5 sumas pequeñas sin penalización', () => {
    const lv = qm.LEVELS['1'];
    const ps = qm.problems(mulberry32(3), lv);
    expect(ps).toHaveLength(5);
    expect(ps.every((p) => p.op === '+' && p.answer <= 10)).toBe(true);
    expect(qm.score(12_000, 3, lv)).toBe(12);
  });

  it('cálculo nivel 5: sumas y restas de dos cifras', () => {
    const ps = qm.problems(mulberry32(4), qm.LEVELS['5']);
    expect(ps.some((p) => (p.op === '+' || p.op === '−') && p.b >= 11)).toBe(true);
  });

  it('colores nivel 1: dos tintas y la palabra siempre coincide', () => {
    const lv = cc.LEVELS['1'];
    const ts = cc.trials(
      mulberry32(5),
      lv.count,
      cc.COLORS.slice(0, lv.colors),
      lv.congruent,
    );
    expect(ts).toHaveLength(8);
    expect(ts.every((t) => t.word === t.ink)).toBe(true);
    expect(new Set(ts.map((t) => t.ink)).size).toBeLessThanOrEqual(2);
  });

  it('sendero con 20 círculos cabe y nivel básico usa 5', () => {
    expect(tr.positions(mulberry32(6), 20)).toHaveLength(20);
    expect(tr.labels('A', tr.LEVELS['5'].count)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('¿cuántos quedan? nivel 1: 3 rondas sólo entrando, de una en una', () => {
    const rs = hc.rounds(mulberry32(7), hc.LEVELS['1']);
    expect(rs).toHaveLength(3);
    for (const r of rs)
      expect(r.moves.every((m) => m.dir === 'in' && m.n === 1)).toBe(true);
  });

  it('criterios de nivel superado', () => {
    expect(ns.passed(4, ns.LEVELS['2'])).toBe(true);
    expect(ns.passed(4, ns.LEVELS.forward)).toBe(false);
    expect(hc.passed(2, hc.LEVELS['1'])).toBe(true);
    expect(qm.passed(2)).toBe(false);
  });
});
