import type { SyncMeta } from './types';

/**
 * Объединяет две коллекции владельческих сущностей по id. При совпадении id
 * побеждает более свежая запись (по updatedAt). Основа для «объединить при импорте»
 * и будущей синхронизации телефон/ноутбук через один файл.
 */
export function mergeById<T extends SyncMeta>(current: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>(current.map((x) => [x.id, x]));
  for (const x of incoming) {
    if (!x?.id) continue;
    const existing = byId.get(x.id);
    if (!existing || (x.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      byId.set(x.id, x);
    }
  }
  return [...byId.values()];
}

/** Сколько id из incoming уже есть в current — для сводки перед импортом. */
export function countOverlap<T extends SyncMeta>(current: T[], incoming: T[]): number {
  const ids = new Set(current.map((x) => x.id));
  return incoming.reduce((n, x) => (x?.id && ids.has(x.id) ? n + 1 : n), 0);
}
