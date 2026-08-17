import type { Session, Drafts, Program, BodyMeasurement, Goal, Settings, ExerciseCatalog } from './types';
import { SEED_PROGRAM, EXERCISE_LIBRARY } from '../data/program';
import { keys, read, write, loadProfile, uuid, DEFAULT_SETTINGS } from './storage';
import { runMigration } from './migrate';

/**
 * Репозиторий — единственная точка доступа к данным.
 * Компоненты и стор ходят сюда, а не в localStorage напрямую: это шов, в который
 * позже подключается облачная синхронизация (и, при необходимости, IndexedDB)
 * без правки вызывающего кода.
 */
export class Repo {
  readonly userId: string;
  private k: ReturnType<typeof keys>;

  constructor(userId?: string) {
    this.userId = userId ?? loadProfile().userId;
    this.k = keys(this.userId);
    runMigration(this.userId);
  }

  // --- программа ---
  getProgram(): Program {
    const p = read<Program | null>(this.k.program, null);
    if (p) return p;
    const seeded: Program = { ...SEED_PROGRAM, userId: this.userId, updatedAt: Date.now(), rev: 1 };
    write(this.k.program, seeded);
    return seeded;
  }

  putProgram(p: Program): Program {
    const next: Program = { ...p, userId: this.userId, updatedAt: Date.now(), rev: (p.rev ?? 0) + 1 };
    write(this.k.program, next);
    return next;
  }

  // --- каталог упражнений ---
  // Пользовательские упражнения (из импортированных планов) поверх встроенной библиотеки.
  private getUserCatalog(): ExerciseCatalog {
    return read<ExerciseCatalog>(this.k.catalog, {});
  }

  getCatalog(): ExerciseCatalog {
    return { ...EXERCISE_LIBRARY, ...this.getUserCatalog() };
  }

  mergeCatalog(add: ExerciseCatalog): ExerciseCatalog {
    write(this.k.catalog, { ...this.getUserCatalog(), ...add });
    return this.getCatalog();
  }

  // --- сессии ---
  getSessions(): Session[] {
    return read<Session[]>(this.k.sessions, []).filter((s) => !s.deleted);
  }

  private writeSessions(list: Session[]): void {
    write(this.k.sessions, list);
  }

  putSession(s: Omit<Session, keyof import('./types').SyncMeta> & Partial<Session>): Session {
    const all = read<Session[]>(this.k.sessions, []);
    const next: Session = {
      ...(s as Session),
      id: s.id ?? uuid(),
      userId: this.userId,
      updatedAt: Date.now(),
      deleted: false,
      rev: (s.rev ?? 0) + 1,
    };
    const idx = all.findIndex((x) => x.id === next.id);
    if (idx >= 0) all[idx] = next;
    else all.push(next);
    this.writeSessions(all);
    return next;
  }

  /** Мягкое удаление: запись остается как tombstone, чтобы удаление доехало до других устройств. */
  deleteSession(id: string): void {
    const all = read<Session[]>(this.k.sessions, []);
    const idx = all.findIndex((s) => s.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], deleted: true, updatedAt: Date.now(), rev: (all[idx].rev ?? 0) + 1 };
    this.writeSessions(all);
  }

  replaceSessions(list: Session[]): Session[] {
    const now = Date.now();
    const normalized = list.map((s) => ({
      ...s,
      id: s.id ?? uuid(),
      userId: this.userId,
      updatedAt: s.updatedAt ?? now,
      deleted: s.deleted ?? false,
    }));
    this.writeSessions(normalized);
    return normalized.filter((s) => !s.deleted);
  }

  // --- черновики (только локально, не синхронизируются) ---
  getDrafts(): Drafts {
    return read<Drafts>(this.k.drafts, {});
  }

  putDrafts(d: Drafts): void {
    write(this.k.drafts, d);
  }

  // --- замеры тела ---
  getBody(): BodyMeasurement[] {
    return read<BodyMeasurement[]>(this.k.body, []).filter((b) => !b.deleted);
  }

  putBody(m: Partial<BodyMeasurement> & { date: string }): BodyMeasurement {
    const all = read<BodyMeasurement[]>(this.k.body, []);
    const next: BodyMeasurement = {
      ...(m as BodyMeasurement),
      id: m.id ?? uuid(),
      userId: this.userId,
      ts: m.ts ?? Date.now(),
      updatedAt: Date.now(),
      deleted: false,
      rev: (m.rev ?? 0) + 1,
    };
    const idx = all.findIndex((x) => x.id === next.id);
    if (idx >= 0) all[idx] = next;
    else all.push(next);
    write(this.k.body, all);
    return next;
  }

  deleteBody(id: string): void {
    const all = read<BodyMeasurement[]>(this.k.body, []);
    const idx = all.findIndex((b) => b.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], deleted: true, updatedAt: Date.now(), rev: (all[idx].rev ?? 0) + 1 };
    write(this.k.body, all);
  }

  // --- цели ---
  getGoals(): Goal[] {
    return read<Goal[]>(this.k.goals, []).filter((g) => !g.deleted);
  }

  putGoal(g: Partial<Goal> & { kind: Goal['kind']; target: number }): Goal {
    const all = read<Goal[]>(this.k.goals, []);
    const next: Goal = {
      ...(g as Goal),
      id: g.id ?? uuid(),
      userId: this.userId,
      updatedAt: Date.now(),
      deleted: false,
      rev: (g.rev ?? 0) + 1,
    };
    const idx = all.findIndex((x) => x.id === next.id);
    if (idx >= 0) all[idx] = next;
    else all.push(next);
    write(this.k.goals, all);
    return next;
  }

  // --- настройки ---
  getSettings(): Settings {
    return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(this.k.settings, {}) };
  }

  putSettings(s: Partial<Settings>): Settings {
    const next = { ...this.getSettings(), ...s };
    write(this.k.settings, next);
    return next;
  }
}

// Единый экземпляр на приложение.
let instance: Repo | null = null;

export function getRepo(): Repo {
  if (!instance) instance = new Repo();
  return instance;
}

// Для тестов: сбросить синглтон между кейсами.
export function resetRepo(): void {
  instance = null;
}
