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
 * Глобальный таймер отдыха. Считает от абсолютной метки endsAt, поэтому переживает
 * сворачивание вкладки (в PWA фоновые таймеры неточны) — при возврате пересчитываем остаток.
 */
export function useRestTimer(opts: { sound: boolean; vibrate: boolean }): RestTimer {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [label, setLabel] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Контекст создаем/разблокируем на клике старта (user gesture), иначе звук финиша
  // через 1-3 минуты браузер оставит в suspended и сигнал не прозвучит.
  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    const Ctor: AudioCtor | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    try {
      if (!audioRef.current) audioRef.current = new Ctor();
      if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    } catch {
      audioRef.current = null;
    }
  }, []);

  const beep = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || ctx.state !== 'running') return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.42);
    } catch {
      // аудио недоступно — не критично
    }
  }, []);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 250);
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [endsAt]);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));

  // Сигнал ровно один раз на финише.
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
      if (optsRef.current.sound) beep();
      // короткий показ «0:00», затем скрываем
      const id = window.setTimeout(() => setEndsAt(null), 900);
      return () => window.clearTimeout(id);
    }
  }, [remaining, endsAt, beep]);

  const start = useCallback(
    (seconds: number, lbl: string) => {
      if (optsRef.current.sound) unlockAudio();
      firedRef.current = false;
      setTotal(seconds);
      setLabel(lbl);
      setNow(Date.now());
      setEndsAt(Date.now() + seconds * 1000);
    },
    [unlockAudio],
  );

  const add = useCallback((seconds: number) => {
    setEndsAt((e) => (e === null ? null : e + seconds * 1000));
    setTotal((t) => t + seconds);
    firedRef.current = false;
  }, []);

  const stop = useCallback(() => setEndsAt(null), []);

  return { active: endsAt !== null, remaining, total, label, start, add, stop };
}
