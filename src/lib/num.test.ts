import { describe, it, expect } from 'vitest';
import { num } from './num';

describe('num', () => {
  it('парсит десятичную точку', () => {
    expect(num('62.5')).toBe(62.5);
  });

  it('парсит десятичную запятую (русская раскладка)', () => {
    expect(num('62,5')).toBe(62.5);
  });

  it('целое число', () => {
    expect(num('20')).toBe(20);
  });

  it('пустая строка даёт NaN', () => {
    expect(Number.isNaN(num(''))).toBe(true);
  });
});
