import { useEffect } from 'react';

/**
 * Поведение модального окна: закрытие по Escape и блокировка прокрутки фона,
 * пока окно открыто. Вызывать в компоненте-шторке.
 */
export function useModalDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);
}
