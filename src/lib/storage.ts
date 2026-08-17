import type { Session, Drafts, Program, BodyMeasurement, Goal, Settings, Profile } from './types';

// --- ключи ---
// v1 (старая схема, читается только миграцией и НИКОГДА не удаляется)
export const V1_HISTORY_KEY = 'gt_history_v1';
export const V1_DRAFTS_KEY = 'gt_drafts_v1';

export const PROFILE_KEY = 'gt_profile_v1';
export const SCHEMA_KEY = 'gt_schema_version';
export const BACKUP_KEY = 'gt_backup_v1_before_v2';

export const SCHEMA_VERSION = 2;

// v2-ключи разбиты по пользователю — заранее поддерживает несколько аккаунтов на устройстве.
export const keys = (userId: string) => ({
  sessions: `gt_${userId}_sessions_v2`,
  program: `gt_${userId}_program_v2`,
  drafts: `gt_${userId}_drafts_v2`,
  body: `gt_${userId}_body_v2`,
  goals: `gt_${userId}_goals_v2`,
  settings: `gt_${userId}_settings_v2`,
  catalog: `gt_${userId}_catalog_v2`,
});

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // хранилище недоступно (приватный режим, переполнение) — молча игнорируем
  }
}

export function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // нет доступа к crypto — используем запасной генератор
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- профиль ---
export function loadProfile(): Profile {
  const p = read<Profile | null>(PROFILE_KEY, null);
  if (p?.userId) return p;
  const next: Profile = { userId: 'local' };
  write(PROFILE_KEY, next);
  return next;
}

export const DEFAULT_SETTINGS: Settings = {
  barWeight: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  defaultRest: 120,
  sound: true,
  vibrate: true,
};

// --- экспорт / импорт ---
export interface ExportBundle {
  version: number;
  exportedAt: string;
  program: Program | null;
  sessions: Session[];
  body: BodyMeasurement[];
  goals: Goal[];
  settings: Settings;
}

export function exportBundle(userId: string): string {
  const k = keys(userId);
  const bundle: ExportBundle = {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    program: read<Program | null>(k.program, null),
    sessions: read<Session[]>(k.sessions, []),
    body: read<BodyMeasurement[]>(k.body, []),
    goals: read<Goal[]>(k.goals, []),
    settings: read<Settings>(k.settings, DEFAULT_SETTINGS),
  };
  return JSON.stringify(bundle, null, 2);
}

// Импорт: принимает и v2-бандл, и старый v1-формат ({ version: 1, history: [...] }).
export function parseImport(json: string): Partial<ExportBundle> {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  if (Array.isArray(parsed?.history)) {
    // старый формат — миграцию сделает вызывающая сторона через migrateSessions
    return { version: 1, sessions: parsed.history as Session[] };
  }
  return {
    version: typeof parsed?.version === 'number' ? parsed.version : SCHEMA_VERSION,
    program: (parsed?.program as Program) ?? null,
    sessions: Array.isArray(parsed?.sessions) ? (parsed.sessions as Session[]) : [],
    body: Array.isArray(parsed?.body) ? (parsed.body as BodyMeasurement[]) : [],
    goals: Array.isArray(parsed?.goals) ? (parsed.goals as Goal[]) : [],
    settings: (parsed?.settings as Settings) ?? undefined,
  };
}

export const isDrafts = (v: unknown): v is Drafts => !!v && typeof v === 'object';
