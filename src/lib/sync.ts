import { supabase } from './supabase';
import { keys, read, write } from './storage';
import { mergeById } from './merge';
import type { Session, BodyMeasurement, Goal, Program, ExerciseCatalog, SyncMeta } from './types';

interface RemoteRow {
  updated_at: number;
  data: unknown;
}

/**
 * Двусторонняя синхронизация массива сущностей (сессии/замеры/цели):
 * тянем удалённые строки, сливаем с локальными по id (свежее побеждает),
 * пишем результат в localStorage и заливаем его обратно.
 */
async function syncArray<T extends SyncMeta>(table: string, localKey: string, uid: string): Promise<void> {
  if (!supabase) return;
  const local = read<T[]>(localKey, []);

  const { data: rows, error } = await supabase.from(table).select('updated_at,data');
  if (error) throw new Error(`${table}: ${error.message}`);
  const remote = (rows ?? []).map((r) => (r as RemoteRow).data as T);

  const merged = mergeById(local, remote);
  write(localKey, merged);

  if (merged.length > 0) {
    const payload = merged.map((e) => ({
      user_id: uid,
      id: e.id,
      updated_at: e.updatedAt ?? 0,
      deleted: e.deleted ?? false,
      data: e,
    }));
    const { error: upErr } = await supabase.from(table).upsert(payload, { onConflict: 'user_id,id' });
    if (upErr) throw new Error(`${table} upsert: ${upErr.message}`);
  }
}

/** Программа + каталог одним объектом: берём более свежую версию по updatedAt. */
async function syncProgram(uid: string): Promise<void> {
  if (!supabase) return;
  const k = keys('local');
  const localProgram = read<Program | null>(k.program, null);
  const localCatalog = read<ExerciseCatalog>(k.catalog, {});

  const { data: rows, error } = await supabase.from('gt_program').select('updated_at,data').limit(1);
  if (error) throw new Error(`gt_program: ${error.message}`);
  const remote = rows?.[0] as RemoteRow | undefined;

  let program = localProgram;
  let catalog = localCatalog;
  if (remote && (!localProgram || remote.updated_at > (localProgram.updatedAt ?? 0))) {
    const bundle = remote.data as { program: Program; catalog: ExerciseCatalog };
    program = bundle.program;
    catalog = bundle.catalog ?? {};
    write(k.program, program);
    write(k.catalog, catalog);
  }

  if (program) {
    const { error: upErr } = await supabase
      .from('gt_program')
      .upsert({ user_id: uid, updated_at: program.updatedAt ?? 0, data: { program, catalog } }, { onConflict: 'user_id' });
    if (upErr) throw new Error(`gt_program upsert: ${upErr.message}`);
  }
}

export interface SyncResult {
  ok: boolean;
  error?: string;
}

/** Полная синхронизация: сессии, замеры, цели, программа. */
export async function syncAll(uid: string): Promise<SyncResult> {
  if (!supabase) return { ok: false, error: 'Supabase не настроен' };
  const k = keys('local');
  try {
    await syncArray<Session>('gt_sessions', k.sessions, uid);
    await syncArray<BodyMeasurement>('gt_body', k.body, uid);
    await syncArray<Goal>('gt_goals', k.goals, uid);
    await syncProgram(uid);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ошибка синхронизации' };
  }
}
