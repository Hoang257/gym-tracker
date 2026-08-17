import { describe, it, expect } from 'vitest';
import { metric, tonnage, readyToProgress, suggestionText, summarizeSets, isPersonalRecord } from './progress';
import type { ResolvedExercise, Session, SetEntry } from './types';

const ex = (over: Partial<ResolvedExercise> = {}): ResolvedExercise => ({
  exerciseId: 'incdb',
  name: 'Наклонный жим',
  unit: 'kg',
  muscles: [],
  sets: 3,
  low: 6,
  high: 10,
  inc: 2,
  ...over,
});

const S = (w: string, r: string): SetEntry => ({ w, r });

describe('metric', () => {
  it('kg → максимальный вес', () => {
    expect(metric('kg', [S('20', '9'), S('22', '8')])).toBe(22);
  });
  it('bw → доп. вес, иначе повторы', () => {
    expect(metric('bw', [S('5', '8')])).toBe(5);
    expect(metric('bw', [S('', '10')])).toBe(10);
  });
  it('sec → максимум секунд из повторов', () => {
    expect(metric('sec', [S('', '45'), S('', '60')])).toBe(60);
  });
  it('пустые подходы → null', () => {
    expect(metric('kg', [S('', '')])).toBe(null);
  });

  it('вес с запятой (русская раскладка) считается верно', () => {
    expect(metric('kg', [S('62,5', '10')])).toBe(62.5);
    expect(tonnage('kg', [S('62,5', '10')])).toBe(625);
  });
});

describe('readyToProgress', () => {
  it('готов, когда все подходы достигли верха диапазона', () => {
    const t = { sets: 3, high: 10, inc: 2, unit: 'kg' as const };
    expect(readyToProgress(t, [S('20', '10'), S('20', '10'), S('20', '10')])).toBe(true);
  });
  it('не готов, если хоть один подход ниже верха', () => {
    const t = { sets: 3, high: 10, inc: 2, unit: 'kg' as const };
    expect(readyToProgress(t, [S('20', '10'), S('20', '9'), S('20', '10')])).toBe(false);
  });
  it('не готов при нехватке подходов', () => {
    const t = { sets: 3, high: 10, inc: 2, unit: 'kg' as const };
    expect(readyToProgress(t, [S('20', '10'), S('20', '10')])).toBe(false);
    expect(readyToProgress(t, null)).toBe(false);
  });
});

describe('suggestionText', () => {
  it('подсказывает прибавку веса', () => {
    const sets = [S('20', '10'), S('20', '10'), S('20', '10')];
    expect(suggestionText(ex(), sets)).toBe('готово к +2 кг');
  });
  it('для bw — вес на пояс', () => {
    const sets = [S('5', '10'), S('5', '10'), S('5', '10')];
    expect(suggestionText(ex({ unit: 'bw' }), sets)).toBe('готово к +весу на пояс');
  });
  it('нет подсказки, если не дотянул', () => {
    expect(suggestionText(ex(), [S('20', '7'), S('20', '7'), S('20', '7')])).toBe(null);
  });
});

describe('summarizeSets', () => {
  it('kg формат', () => {
    expect(summarizeSets('kg', [S('20', '10'), S('22', '8')])).toBe('20×10 · 22×8');
  });
  it('bw формат с плюсом', () => {
    expect(summarizeSets('bw', [S('5', '8'), S('', '6')])).toBe('+5×8 · 6');
  });
  it('пропускает пустые', () => {
    expect(summarizeSets('kg', [S('', ''), S('20', '10')])).toBe('20×10');
    expect(summarizeSets('kg', null)).toBe(null);
  });
});

describe('isPersonalRecord', () => {
  const session = (w: string, r: string): Session => ({
    id: 'x', userId: 'local', updatedAt: 0, date: '2026-08-01', ts: 1,
    programId: 'p', dayId: 'push', dayTitle: 'Верх',
    logs: [{ exerciseId: 'incdb', name: 'Жим', unit: 'kg', sets: [S(w, r)], done: true }],
  });

  it('первый результат — всегда рекорд', () => {
    expect(isPersonalRecord([], 'incdb', 'kg', 20)).toBe(true);
  });
  it('больше прошлого максимума — рекорд', () => {
    expect(isPersonalRecord([session('20', '8')], 'incdb', 'kg', 22)).toBe(true);
  });
  it('не больше — не рекорд', () => {
    expect(isPersonalRecord([session('24', '8')], 'incdb', 'kg', 22)).toBe(false);
  });
});
