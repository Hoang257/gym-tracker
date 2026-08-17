import { useCallback, useEffect, useRef, useState } from 'react';

export interface RestTimer {
  active: boolean;
  remaining: number; // секунд осталось
  total: number; // исходная длительность
  label: string;
  start: (seconds: number, label: string) => void;
  add: (seconds: number) => void;
  stop: () => void;
}

type AudioCtor = typeof AudioContext;

/**
 * Глобальный таймер отдыха. Считает от абсолютной метки endsAt.
 * Сигнал ПЛАНИРУЕТСЯ заранее по часам AudioContext (osc.start в будущий момент),
 * а не ждёт тика setInterval — поэтому звучит вовремя даже если вкладка свёрнута.
 * Пока идёт отдых, держим экран включённым через Wake Lock.
 */
export function useRestTimer(opts: { sound: boolean; vibrate: boolean }): RestTimer {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [label, setLabel] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  const endsAtRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const scheduledRef = useRef<OscillatorNode | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  const optsRef = useRef(opts);
  optsRef.current = opts;

  const ensureAudio = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const Ctor: AudioCtor | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      if (!audioRef.current) audioRef.current = new Ctor();
      if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    } catch {
      audioRef.current = null;
    }
    return audioRef.current;
  }, []);

  const cancelScheduled = useCallback(() => {
    if (scheduledRef.current) {
      try {
        scheduledRef.current.stop();
        scheduledRef.current.disconnect();
      } catch {
        // уже остановлен
      }
      scheduledRef.current = null;
    }
  }, []);

  // Запланировать бип на N секунд вперёд по часам AudioContext.
  const scheduleBeep = useCallback((secondsFromNow: number) => {
    cancelScheduled();
    if (!optsRef.current.sound) return;
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + Math.max(0, secondsFromNow);
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
      scheduledRef.current = osc;
    } catch {
      // аудио недоступно — не критично
    }
  }, [cancelScheduled, ensureAudio]);

  const requestWake = useCallback(async () => {
    try {
      const wl = await navigator.wakeLock?.request('screen');
      if (wl) wakeRef.current = wl;
    } catch {
      // Wake Lock недоступен (не в фокусе / не поддерживается) — не критично
    }
  }, []);

  const releaseWake = useCallback(() => {
    try {
      void wakeRef.current?.release();
    } catch {
      // уже освобождён
    }
    wakeRef.current = null;
  }, []);

  // Тик только для отображения остатка.
  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 250);
    const onVis = () => {
      tick();
      // система освобождает Wake Lock при уходе со страницы — берём заново при возврате
      if (document.visibilityState === 'visible' && endsAtRef.current) void requestWake();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [endsAt, requestWake]);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));

  // Финиш: вибрация (звук уже запланирован по часам ctx), освобождение экрана, скрытие.
  useEffect(() => {
    if (endsAt === null) {
      firedRef.current = false;
      return;
    }
    if (remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      if (optsRef.current.vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 40, 15]);
      }
      releaseWake();
      const id = window.setTimeout(() => setEndsAt(null), 900);
      return () => window.clearTimeout(id);
    }
  }, [remaining, endsAt, releaseWake]);

  const start = useCallback(
    (seconds: number, lbl: string) => {
      firedRef.current = false;
      const end = Date.now() + seconds * 1000;
      endsAtRef.current = end;
      setTotal(seconds);
      setLabel(lbl);
      setNow(Date.now());
      setEndsAt(end);
      scheduleBeep(seconds);
      void requestWake();
    },
    [scheduleBeep, requestWake],
  );

  const add = useCallback(
    (seconds: number) => {
      firedRef.current = false;
      setEndsAt((e) => {
        const end = (e === null ? Date.now() : e) + seconds * 1000;
        endsAtRef.current = end;
        scheduleBeep((end - Date.now()) / 1000);
        return end;
      });
      setTotal((t) => t + seconds);
    },
    [scheduleBeep],
  );

  const stop = useCallback(() => {
    endsAtRef.current = null;
    cancelScheduled();
    releaseWake();
    setEndsAt(null);
  }, [cancelScheduled, releaseWake]);

  return { active: endsAt !== null, remaining, total, label, start, add, stop };
}
