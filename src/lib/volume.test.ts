import { describe, it, expect } from 'vitest';
import { weeklyVolume, volumeStatus, currentWeekVolume } from './volume';
import type { Session, MuscleTag, SetEntry } from './types';

const set = (r: string): SetEntry => ({ w: '20', r });

function session(ts: number, muscles: MuscleTag[], reps: string[]): Session {
  return {
    id: `s-${ts}`, userId: 'local', updatedAt: ts, date: '2026-08-17', ts,
    programId: 'p', dayId: 'push', dayTitle: 'Верх',
    logs: [{ exerciseId: 'x', name: 'Жим', unit: 'kg', muscles, sets: reps.map(set), done: true }],
  };
}

const NOW = new Date(2026, 7, 17); // понедельник
const inWeek = NOW.getTime() + 3600_000;

describe('weeklyVolume', () => {
  it('primary = 1 подход, secondary = 0.5', () => {
    const s = session(inWeek, [
      { group: 'chest', role: 'primary' },
      { group: 'triceps', role: 'secondary' },
    ], ['10', '10', '10', '10']); // 4 рабочих подхода
    const vol = weeklyVolume([s], NOW);
    expect(vol.find((v) => v.group === 'chest')?.sets).toBe(4);
    expect(vol.find((v) => v.group === 'triceps')?.sets).toBe(2);
  });

  it('считает только подходы с введенными повторами', () => {
    const s = session(inWeek, [{ group: 'chest', role: 'primary' }], ['10', '', '0']);
    expect(weeklyVolume([s], NOW).find((v) => v.group === 'chest')?.sets).toBe(1);
  });

  it('исключает сессии вне периода', () => {
    const old = session(new Date(2026, 6, 1).getTime(), [{ group: 'chest', role: 'primary' }], ['10']);
    expect(weeklyVolume([old], NOW)).toHaveLength(0);
  });

  it('сортирует по убыванию объема', () => {
    const s = session(inWeek, [
      { group: 'chest', role: 'primary' },
      { group: 'biceps', role: 'secondary' },
    ], ['10', '10']);
    const vol = weeklyVolume([s], NOW);
    expect(vol[0].group).toBe('chest');
    expect(vol[0].sets).toBeGreaterThan(vol[1].sets);
  });

  it('суммирует одну группу из разных упражнений', () => {
    const s1 = session(inWeek, [{ group: 'chest', role: 'primary' }], ['10', '10']);
    const s2 = session(inWeek + 1000, [{ group: 'chest', role: 'primary' }], ['10']);
    expect(weeklyVolume([s1, s2], NOW).find((v) => v.group === 'chest')?.sets).toBe(3);
  });

  it('пропускает логи без разметки мышц', () => {
    const s = session(inWeek, [], ['10', '10']);
    expect(weeklyVolume([s], NOW)).toHaveLength(0);
  });
});

describe('volumeStatus', () => {
  it('низкий / норма / высокий по ориентиру 10-20', () => {
    expect(volumeStatus(5)).toBe('low');
    expect(volumeStatus(14)).toBe('ok');
    expect(volumeStatus(25)).toBe('high');
  });
});

describe('currentWeekVolume', () => {
  it('берет сессии текущей недели', () => {
    const s = session(inWeek, [{ group: 'chest', role: 'primary' }], ['10']);
    expect(currentWeekVolume([s], NOW).length).toBeGreaterThan(0);
  });
});
