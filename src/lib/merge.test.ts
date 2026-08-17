import { describe, it, expect } from 'vitest';
import { mergeById, countOverlap } from './merge';
import type { Session } from './types';

const s = (id: string, updatedAt: number, date = '2026-08-01'): Session => ({
  id, userId: 'local', updatedAt, date, ts: updatedAt,
  programId: 'p', dayId: 'push', dayTitle: 'Верх', logs: [],
});

describe('mergeById', () => {
  it('объединяет без потерь уникальные записи', () => {
    const r = mergeById([s('a', 1)], [s('b', 2)]);
    expect(r.map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('при совпадении id берёт более свежую (updatedAt)', () => {
    const r = mergeById([s('a', 1, '2026-01-01')], [s('a', 5, '2026-09-09')]);
    expect(r).toHaveLength(1);
    expect(r[0].date).toBe('2026-09-09');
  });

  it('старая версия не затирает более свежую существующую', () => {
    const r = mergeById([s('a', 10, '2026-09-09')], [s('a', 2, '2026-01-01')]);
    expect(r[0].date).toBe('2026-09-09');
  });
});

describe('countOverlap', () => {
  it('считает пересечение по id', () => {
    expect(countOverlap([s('a', 1), s('b', 1)], [s('b', 2), s('c', 2)])).toBe(1);
    expect(countOverlap([], [s('a', 1)])).toBe(0);
  });
});
