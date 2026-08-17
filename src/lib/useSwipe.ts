import { useEffect, useRef } from 'react';

/**
 * Горизонтальный свайп/перетаскивание по элементу. Pointer events покрывают
 * и палец (touch), и мышь. Свайп на полях ввода игнорируется, чтобы не мешать
 * выделению текста и вертикальному скроллу.
 */
export function useSwipe<T extends HTMLElement>(onLeft: () => void, onRight: () => void) {
  const ref = useRef<T>(null);
  const cb = useRef({ onLeft, onRight });
  cb.current = { onLeft, onRight };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let x = 0;
    let y = 0;
    let tracking = false;

    const start = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [data-no-swipe]')) return;
      x = e.clientX;
      y = e.clientY;
      tracking = true;
    };

    const end = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      // уверенно горизонтальный жест: длина > 60px и заметно горизонтальнее вертикали
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) cb.current.onLeft();
        else cb.current.onRight();
      }
    };

    const cancel = () => {
      tracking = false;
    };

    el.addEventListener('pointerdown', start, { passive: true });
    el.addEventListener('pointerup', end, { passive: true });
    el.addEventListener('pointercancel', cancel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', start);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', cancel);
    };
  }, []);

  return ref;
}
