import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Ключи берутся из переменных окружения (Vercel / .env.local). anon-ключ Supabase
// безопасно держать на клиенте: доступ к данным ограничивает RLS на стороне БД.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Настроен ли Supabase. Если нет — приложение работает чисто локально. */
export const isSupabaseConfigured = Boolean(url && anon);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
