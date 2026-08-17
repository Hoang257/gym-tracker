import { useEffect, useRef } from 'react';

/**
 * Горизонтальный свайп/перетаскивание по элементу. Pointer events покрывают
 * и палец (touch), и мышь. Жест распознается уже в движении (pointermove), а не
 * только на отпускании — так свайп срабатывает надежно, даже если браузер
 * попытается перехватить его (например, свайп вправо как системное «назад»).
 * Захват указателя (setPointerCapture) удерживает события на элементе.
 * Свайп на полях ввода игнорируется, чтобы не мешать выделению и скроллу.
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
    let fired = false;

    const start = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [data-no-swipe]')) return;
      x = e.clientX;
      y = e.clientY;
      tracking = true;
      fired = false;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // не критично, если захват недоступен
      }
    };

    const move = (e: PointerEvent) => {
      if (!tracking || fired) return;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      // уверенно горизонтальный жест: длина > 55px и заметно горизонтальнее вертикали
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        fired = true;
        tracking = false;
        if (dx < 0) cb.current.onLeft();
        else cb.current.onRight();
      }
    };

    const stop = () => {
      tracking = false;
    };

    el.addEventListener('pointerdown', start, { passive: true });
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerup', stop, { passive: true });
    el.addEventListener('pointercancel', stop, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', start);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', stop);
      el.removeEventListener('pointercancel', stop);
    };
  }, []);

  return ref;
}
