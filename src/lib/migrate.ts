import type { Session, ExerciseLog, SetEntry, AccentKey } from './types';
import { EXERCISE_LIBRARY, SEED_PROGRAM } from '../data/program';
import {
  V1_HISTORY_KEY, V1_DRAFTS_KEY, BACKUP_KEY, SCHEMA_KEY, SCHEMA_VERSION,
  keys, read, write, uuid,
} from './storage';

// --- старая (v1) форма записей ---
interface V1Log {
  id: string;
  sets: SetEntry[];
  done: boolean;
}

interface V1Session {
  id: string;
  date: string;
  ts: number;
  dayKey: string; // 'push' | 'legs' | 'pull'
  logs: V1Log[];
}

const V1_DAY_TITLE: Record<string, string> = {
  push: 'Верх · Ширина',
  legs: 'Ноги',
  pull: 'Верх · Толщина',
};

const V1_DAY_ACCENT: Record<string, AccentKey> = {
  push: 'type-1',
  legs: 'type-3',
  pull: 'type-2',
};

/**
 * Бэкфилл лога: старая запись хранила только id упражнения, поэтому имя, единицы,
 * мышцы и цели достаем из каталога. Если упражнение неизвестно (переименовано или
 * удалено), сохраняем id как имя — данные не теряются.
 */
export function migrateLog(log: V1Log, dayId: string): ExerciseLog {
  const ex = EXERCISE_LIBRARY[log.id];
  const day = SEED_PROGRAM.days.find((d) => d.id === dayId);
  const slot = day?.slots.find((s) => s.exerciseId === log.id);

  return {
    exerciseId: log.id,
    name: ex?.name ?? log.id,
    unit: ex?.unit ?? 'kg',
    muscles: ex?.muscles,
    target: slot ? { sets: slot.sets, low: slot.low, high: slot.high, inc: slot.inc } : undefined,
    sets: Array.isArray(log.sets) ? log.sets : [],
    done: !!log.done,
  };
}

export function migrateSession(s: V1Session, userId: string): Session {
  const dayId = s.dayKey;
  return {
    id: uuid(),
    userId,
    updatedAt: s.ts ?? Date.now(),
    deleted: false,
    rev: 1,
    date: s.date,
    ts: s.ts ?? Date.now(),
    programId: SEED_PROGRAM.id,
    dayId,
    dayTitle: V1_DAY_TITLE[dayId] ?? dayId,
    accent: V1_DAY_ACCENT[dayId],
    logs: Array.isArray(s.logs) ? s.logs.map((l) => migrateLog(l, dayId)) : [],
  };
}

export function migrateSessions(list: V1Session[], userId: string): Session[] {
  return list.map((s) => migrateSession(s, userId));
}

export interface MigrationResult {
  ran: boolean;
  migrated: number;
}

/** Перенос черновиков v1 → v2 (только если v2-черновиков еще нет). */
function migrateDraftsInto(destKey: string): void {
  if (read<unknown>(destKey, null) !== null) return; // v2-черновики уже есть
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(V1_DRAFTS_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') write(destKey, parsed);
  } catch {
    // битые черновики не критичны — пропускаем
  }
}

/**
 * Миграция v1 → v2. Идемпотентна (защищена флагом схемы).
 * Старый ключ gt_history_v1 НЕ удаляется, а его сырое содержимое дополнительно
 * копируется в бэкап — если что-то пойдет не так, данные можно восстановить.
 */
export function runMigration(userId: string): MigrationResult {
  const version = read<number>(SCHEMA_KEY, 0);
  if (version >= SCHEMA_VERSION) return { ran: false, migrated: 0 };

  const k = keys(userId);

  // Черновики v1 переносим всегда (даже если истории нет): структура Draft совместима,
  // а ключ `${date}_${dayKey}` совпадает с `${date}_${dayId}`. Иначе незавершенная
  // тренировка потерялась бы при обновлении схемы.
  migrateDraftsInto(k.drafts);

  // Если v2-сессии уже есть, просто помечаем схему и выходим (не перетираем).
  const existing = read<Session[] | null>(k.sessions, null);
  if (existing && existing.length > 0) {
    write(SCHEMA_KEY, SCHEMA_VERSION);
    return { ran: false, migrated: 0 };
  }

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(V1_HISTORY_KEY);
  } catch {
    raw = null;
  }

  if (!raw) {
    write(SCHEMA_KEY, SCHEMA_VERSION);
    return { ran: false, migrated: 0 };
  }

  // Бэкап сырых данных до любой записи.
  write(BACKUP_KEY, { at: new Date().toISOString(), history: raw });

  let old: V1Session[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    old = Array.isArray(parsed) ? (parsed as V1Session[]) : [];
  } catch {
    // битый JSON — не трогаем ничего, чтобы не потерять исходник
    return { ran: false, migrated: 0 };
  }

  const migrated = migrateSessions(old, userId);
  write(k.sessions, migrated);
  write(SCHEMA_KEY, SCHEMA_VERSION);
  return { ran: true, migrated: migrated.length };
}
