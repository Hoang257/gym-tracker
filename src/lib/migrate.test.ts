import { describe, it, expect, beforeEach } from 'vitest';
import { runMigration, migrateSession } from './migrate';
import { V1_HISTORY_KEY, V1_DRAFTS_KEY, BACKUP_KEY, SCHEMA_KEY, keys, read } from './storage';
import type { Session, Drafts } from './types';

const USER = 'local';

const v1Session = {
  id: '2026-08-11_push_1754900000000',
  date: '2026-08-11',
  ts: 1754900000000,
  dayKey: 'push',
  logs: [
    { id: 'incdb', sets: [{ w: '20', r: '9' }, { w: '20', r: '8' }], done: true },
    { id: 'pullup', sets: [{ w: '', r: '7' }], done: true },
    { id: 'unknown_old_exercise', sets: [{ w: '30', r: '10' }], done: false },
  ],
};

beforeEach(() => {
  localStorage.clear();
});

describe('миграция v1 → v2', () => {
  it('переносит историю и не теряет подходы', () => {
    localStorage.setItem(V1_HISTORY_KEY, JSON.stringify([v1Session]));

    const res = runMigration(USER);
    expect(res.ran).toBe(true);
    expect(res.migrated).toBe(1);

    const sessions = read<Session[]>(keys(USER).sessions, []);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].logs).toHaveLength(3);
    expect(sessions[0].logs[0].sets).toEqual([{ w: '20', r: '9' }, { w: '20', r: '8' }]);
    expect(sessions[0].date).toBe('2026-08-11');
  });

  it('бэкфиллит имя, единицы и мышцы из каталога', () => {
    const s = migrateSession(v1Session, USER);
    const incdb = s.logs[0];
    expect(incdb.name).toBe('Наклонный жим гантелей');
    expect(incdb.unit).toBe('kg');
    expect(incdb.muscles?.some((m) => m.group === 'chest' && m.role === 'primary')).toBe(true);
    expect(incdb.target).toEqual({ sets: 4, low: 6, high: 10, inc: 2 });

    const pullup = s.logs[1];
    expect(pullup.unit).toBe('bw');
  });

  it('не теряет упражнение, которого больше нет в каталоге', () => {
    const s = migrateSession(v1Session, USER);
    const unknown = s.logs[2];
    expect(unknown.exerciseId).toBe('unknown_old_exercise');
    expect(unknown.name).toBe('unknown_old_exercise');
    expect(unknown.unit).toBe('kg');
    expect(unknown.sets).toEqual([{ w: '30', r: '10' }]);
  });

  it('сохраняет заголовок дня и проставляет sync-метаданные', () => {
    const s = migrateSession(v1Session, USER);
    expect(s.dayTitle).toBe('Верх · Ширина');
    expect(s.dayId).toBe('push');
    expect(s.userId).toBe(USER);
    expect(s.deleted).toBe(false);
    expect(s.id).not.toBe(v1Session.id);
    expect(s.updatedAt).toBe(v1Session.ts);
  });

  it('делает бэкап и НЕ удаляет старый ключ', () => {
    const raw = JSON.stringify([v1Session]);
    localStorage.setItem(V1_HISTORY_KEY, raw);

    runMigration(USER);

    expect(localStorage.getItem(V1_HISTORY_KEY)).toBe(raw);
    const backup = read<{ history: string }>(BACKUP_KEY, { history: '' });
    expect(backup.history).toBe(raw);
  });

  it('идемпотентна: повторный запуск ничего не делает', () => {
    localStorage.setItem(V1_HISTORY_KEY, JSON.stringify([v1Session]));

    expect(runMigration(USER).ran).toBe(true);
    expect(runMigration(USER).ran).toBe(false);

    expect(read<Session[]>(keys(USER).sessions, [])).toHaveLength(1);
  });

  it('не затирает уже существующие v2-сессии', () => {
    localStorage.setItem(V1_HISTORY_KEY, JSON.stringify([v1Session]));
    const existing = [{ id: 'keep-me', logs: [] }];
    localStorage.setItem(keys(USER).sessions, JSON.stringify(existing));

    const res = runMigration(USER);

    expect(res.ran).toBe(false);
    expect(read<Session[]>(keys(USER).sessions, [])[0].id).toBe('keep-me');
  });

  it('на битом JSON не падает и не портит данные', () => {
    localStorage.setItem(V1_HISTORY_KEY, '{ это не json');

    const res = runMigration(USER);

    expect(res.ran).toBe(false);
    expect(read<Session[]>(keys(USER).sessions, [])).toEqual([]);
    expect(localStorage.getItem(V1_HISTORY_KEY)).toBe('{ это не json');
  });

  it('на чистой установке просто помечает схему', () => {
    const res = runMigration(USER);
    expect(res.ran).toBe(false);
    expect(read<number>(SCHEMA_KEY, 0)).toBe(2);
  });

  it('переносит незавершенный черновик v1 → v2', () => {
    const draft = {
      '2026-08-16_push': {
        done: { incdb: true },
        sets: { incdb: [{ w: '22', r: '9' }, { w: '22', r: '8' }] },
      },
    };
    localStorage.setItem(V1_DRAFTS_KEY, JSON.stringify(draft));

    runMigration(USER);

    const v2 = read<Drafts>(keys(USER).drafts, {});
    expect(v2['2026-08-16_push']?.sets.incdb).toEqual([{ w: '22', r: '9' }, { w: '22', r: '8' }]);
    expect(v2['2026-08-16_push']?.done.incdb).toBe(true);
  });

  it('переносит черновик даже без истории', () => {
    localStorage.setItem(V1_DRAFTS_KEY, JSON.stringify({ '2026-08-16_legs': { done: {}, sets: {} } }));
    const res = runMigration(USER);
    expect(res.ran).toBe(false); // истории нет
    expect(read<Drafts>(keys(USER).drafts, {})['2026-08-16_legs']).toBeDefined();
  });
});
