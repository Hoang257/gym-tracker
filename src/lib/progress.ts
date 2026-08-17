import type { Session, SetEntry, Unit, ResolvedExercise, ExerciseLog } from './types';

/** Последняя завершенная сессия данного дня программы. */
export function lastSession(history: Session[], dayId: string): Session | null {
  const filtered = history
    .filter((s) => s.dayId === dayId)
    .sort((a, b) => b.ts - a.ts);
  return filtered[0] ?? null;
}

export function findLog(session: Session | null, exerciseId: string): ExerciseLog | null {
  if (!session) return null;
  return session.logs.find((l) => l.exerciseId === exerciseId) ?? null;
}

export function lastSetsFor(session: Session | null, exerciseId: string): SetEntry[] | null {
  const log = findLog(session, exerciseId);
  if (!log || log.sets.length === 0) return null;
  const hasData = log.sets.some((s) => s.w !== '' || s.r !== '');
  return hasData ? log.sets : null;
}

/** Число для отслеживания прогресса: вес (кг), повторы (bw) или секунды (sec). */
export function metric(unit: Unit, sets: SetEntry[]): number | null {
  const nums = sets
    .map((s) => {
      if (unit === 'sec') return parseFloat(s.r);
      if (unit === 'bw') return parseFloat(s.w) > 0 ? parseFloat(s.w) : parseFloat(s.r);
      return parseFloat(s.w);
    })
    .filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

export function metricLabel(unit: Unit): string {
  if (unit === 'sec') return 'с';
  if (unit === 'bw') return 'повт';
  return 'кг';
}

/** Суммарный тоннаж подходов (кг × повторы), для статистики дня. */
export function tonnage(unit: Unit, sets: SetEntry[]): number {
  if (unit === 'sec') return 0;
  return sets.reduce((sum, s) => {
    const w = parseFloat(s.w);
    const r = parseFloat(s.r);
    if (Number.isNaN(r)) return sum;
    return sum + (Number.isNaN(w) ? 0 : w) * r;
  }, 0);
}

/** Число выполненных (с введенными повторами) подходов. */
export function workingSets(sets: SetEntry[]): number {
  return sets.filter((s) => {
    const r = parseFloat(s.r);
    return !Number.isNaN(r) && r > 0;
  }).length;
}

interface ProgressTarget {
  sets: number;
  high: number;
  inc: number;
  unit: Unit;
}

/** Готов ли к прибавке: все подходы прошлого раза достигли верха диапазона. */
export function readyToProgress(t: ProgressTarget, sets: SetEntry[] | null): boolean {
  if (!sets || sets.length < t.sets) return false;
  const reps = sets.map((s) => parseFloat(s.r)).filter((n) => !Number.isNaN(n));
  if (reps.length < t.sets) return false;
  return reps.every((r) => r >= t.high);
}

export function suggestionText(ex: ResolvedExercise, sets: SetEntry[] | null): string | null {
  const t = { sets: ex.sets, high: ex.high, inc: ex.inc, unit: ex.unit };
  if (!readyToProgress(t, sets)) return null;
  if (ex.unit === 'bw') return 'готово к +весу на пояс';
  if (ex.unit === 'sec') return 'готово к +времени';
  return `готово к +${ex.inc} кг`;
}

/** Короткая сводка подходов: "16×10 · 16×9 · 16×8". */
export function summarizeSets(unit: Unit, sets: SetEntry[] | null): string | null {
  if (!sets) return null;
  const parts = sets
    .filter((s) => s.w !== '' || s.r !== '')
    .map((s) => {
      if (unit === 'sec') return `${s.r || '?'}с`;
      if (unit === 'bw') return s.w && parseFloat(s.w) > 0 ? `+${s.w}×${s.r || '?'}` : `${s.r || '?'}`;
      return `${s.w || '?'}×${s.r || '?'}`;
    });
  return parts.length ? parts.join(' · ') : null;
}

/** Новый ли это личный рекорд по метрике среди прошлых сессий. */
export function isPersonalRecord(history: Session[], exerciseId: string, unit: Unit, value: number): boolean {
  const prev = history
    .flatMap((s) => s.logs.filter((l) => l.exerciseId === exerciseId))
    .map((l) => metric(unit, l.sets))
    .filter((n): n is number => n !== null);
  if (prev.length === 0) return true;
  return value > Math.max(...prev);
}
