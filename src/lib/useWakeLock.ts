import { useEffect } from 'react';

/**
 * Держит экран включённым, пока active=true (например, открыт день тренировки).
 * Система освобождает Wake Lock при уходе со страницы — при возврате берём заново.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        const wl = await navigator.wakeLock?.request('screen');
        if (wl && !released) sentinel = wl;
        else if (wl) void wl.release();
      } catch {
        // Wake Lock недоступен — не критично
      }
    };

    void request();
    const onVis = () => {
      if (document.visibilityState === 'visible' && !released) void request();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVis);
      try {
        void sentinel?.release();
      } catch {
        // уже освобождён
      }
    };
  }, [active]);
}
