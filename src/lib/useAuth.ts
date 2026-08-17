import { useEffect, useState } from 'react';
import type { Session as AuthSession } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Вход по одноразовой ссылке на почту (без пароля).
  const signIn = async (email: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Синхронизация не настроена' };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message };
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return {
    configured: isSupabaseConfigured,
    ready,
    session,
    user: session?.user ?? null,
    signIn,
    signOut,
  };
}
