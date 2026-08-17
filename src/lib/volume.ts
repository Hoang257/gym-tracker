import type { Session, MuscleGroup, MuscleTag } from './types';
import { weekStart } from './date';
import { num } from './num';

// Русские подписи групп мышц для UI.
export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Грудь',
  back_lats: 'Широчайшие',
  back_mid: 'Середина спины',
  delts_side: 'Средняя дельта',
  delts_rear: 'Задняя дельта',
  delts_front: 'Передняя дельта',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  quads: 'Квадрицепс',
  hamstrings: 'Бицепс бедра',
  glutes: 'Ягодицы',
  calves: 'Икры',
  abs: 'Пресс',
  forearms: 'Предплечья',
};

// Ориентир недельного объема (эффективных подходов на группу).
export const VOLUME_TARGET = { low: 10, high: 20 };

/** Рабочий ли это подход: есть введенные повторы > 0. */
function isWorkingSet(r: string): boolean {
  const n = num(r);
  return !Number.isNaN(n) && n > 0;
}

export interface MuscleVolume {
  group: MuscleGroup;
  label: string;
  sets: number; // эффективные подходы (primary=1, secondary=0.5)
}

/**
 * Недельный объем по группам мышц из сессий за период.
 * Мышцы берутся из снапшота лога (стабильно исторически). Эффективный подход:
 * 1.0 за primary-мышцу, 0.5 за secondary — стандартный подход к учету объема.
 */
export function weeklyVolume(sessions: Session[], from: Date, to?: Date): MuscleVolume[] {
  const fromTs = from.getTime();
  const toTs = to ? to.getTime() : Infinity;
  const acc = new Map<MuscleGroup, number>();

  for (const s of sessions) {
    if (s.ts < fromTs || s.ts > toTs) continue;
    for (const log of s.logs) {
      if (!log.muscles || log.muscles.length === 0) continue;
      const working = log.sets.filter((set) => isWorkingSet(set.r)).length;
      if (working === 0) continue;
      for (const tag of log.muscles) {
        const weight = tag.role === 'primary' ? 1 : 0.5;
        acc.set(tag.group, (acc.get(tag.group) ?? 0) + working * weight);
      }
    }
  }

  return [...acc.entries()]
    .map(([group, sets]) => ({ group, label: MUSCLE_LABEL[group], sets: Math.round(sets * 10) / 10 }))
    .sort((a, b) => b.sets - a.sets);
}

/** Объем за текущую ISO-неделю (с понедельника). */
export function currentWeekVolume(sessions: Session[], now = new Date()): MuscleVolume[] {
  return weeklyVolume(sessions, weekStart(now));
}

export type VolumeStatus = 'low' | 'ok' | 'high';

export function volumeStatus(sets: number): VolumeStatus {
  if (sets < VOLUME_TARGET.low) return 'low';
  if (sets > VOLUME_TARGET.high) return 'high';
  return 'ok';
}

// Соответствие групп мышц регионам SVG-силуэта тела (перед/спина).
export const MUSCLE_REGION: Record<MuscleGroup, 'front' | 'back'> = {
  chest: 'front', delts_front: 'front', biceps: 'front', quads: 'front', abs: 'front', forearms: 'front',
  back_lats: 'back', back_mid: 'back', delts_rear: 'back', delts_side: 'back',
  triceps: 'back', hamstrings: 'back', glutes: 'back', calves: 'back',
};

/** Все известные группы мышц с их объемом (включая нулевые) — для тепловой карты. */
export function allMuscleVolume(sessions: Session[], from: Date, to?: Date): Map<MuscleGroup, number> {
  const filled = weeklyVolume(sessions, from, to);
  const map = new Map<MuscleGroup, number>();
  for (const g of Object.keys(MUSCLE_LABEL) as MuscleGroup[]) map.set(g, 0);
  for (const v of filled) map.set(v.group, v.sets);
  return map;
}

export type { MuscleTag };
