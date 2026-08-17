import { describe, it, expect } from 'vitest';
import { computePlates, summarizePlates } from './plates';

const STD = [25, 20, 15, 10, 5, 2.5, 1.25];

describe('computePlates', () => {
  it('пустой набор, если цель равна грифу или меньше', () => {
    expect(computePlates(20, 20, STD)).toEqual({ perSide: [], achievable: 20, exact: true });
    expect(computePlates(15, 20, STD).perSide).toEqual([]);
  });

  it('простая раскладка 60 кг на грифе 20', () => {
    const r = computePlates(60, 20, STD);
    expect(r.perSide).toEqual([20]);
    expect(r.achievable).toBe(60);
    expect(r.exact).toBe(true);
  });

  it('жадно берет крупные блины: 100 кг → 25 + 15 на сторону', () => {
    const r = computePlates(100, 20, STD);
    expect(r.perSide).toEqual([25, 15]);
    expect(r.achievable).toBe(100);
    expect(r.exact).toBe(true);
  });

  it('дробный вес с мелкими блинами: 62.5 кг', () => {
    const r = computePlates(62.5, 20, STD);
    expect(r.achievable).toBeCloseTo(62.5, 5);
    expect(r.exact).toBe(true);
    expect(r.perSide).toEqual([20, 1.25]);
  });

  it('недостижимая цель округляется вниз', () => {
    const r = computePlates(61, 20, STD);
    expect(r.achievable).toBe(60);
    expect(r.exact).toBe(false);
  });

  it('учитывает вес грифа', () => {
    expect(computePlates(50, 15, STD).achievable).toBeCloseTo(50, 5); // 17.5 на сторону
  });
});

describe('summarizePlates', () => {
  it('группирует повторяющиеся блины', () => {
    expect(summarizePlates([25, 25, 10])).toBe('25 × 2, 10');
    expect(summarizePlates([20])).toBe('20');
    expect(summarizePlates([])).toBe('—');
  });
});
