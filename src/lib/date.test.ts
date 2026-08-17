import { describe, it, expect } from 'vitest';
import { localDate, formatDate, daysAgo } from './date';

describe('date utils', () => {
  it('localDate форматирует в YYYY-MM-DD', () => {
    expect(localDate(new Date(2026, 7, 16))).toBe('2026-08-16');
  });

  it('formatDate содержит число и месяц', () => {
    expect(formatDate('2026-08-16')).toContain('16 авг');
  });

  it('daysAgo считает разницу в днях', () => {
    const from = new Date(2026, 7, 16);
    expect(daysAgo('2026-08-14', from)).toBe(2);
    expect(daysAgo('2026-08-16', from)).toBe(0);
  });
});
