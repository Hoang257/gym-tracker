import { useState } from 'react';
import { useModalDismiss } from '../lib/useModal';
import { syncAll } from '../lib/sync';
import type { useAuth } from '../lib/useAuth';
import type { Store } from '../lib/useStore';

interface Props {
  auth: ReturnType<typeof useAuth>;
  store: Store;
  onClose: () => void;
  onToast: (m: string) => void;
}

export function AccountSheet({ auth, store, onClose, onToast }: Props) {
  useModalDismiss(onClose);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const login = async () => {
    if (!/.+@.+\..+/.test(email.trim())) {
      setErr('Введи корректный email');
      return;
    }
    setBusy(true);
    setErr('');
    const { error } = await auth.signIn(email.trim());
    setBusy(false);
    if (error) setErr(error);
    else setSent(true);
  };

  const sync = async () => {
    if (!auth.user) return;
    setBusy(true);
    const res = await syncAll(auth.user.id);
    setBusy(false);
    if (res.ok) {
      store.reloadAll();
      onToast('Синхронизировано с облаком');
    } else {
      onToast(`Не удалось: ${res.error}`);
    }
  };

  const logout = async () => {
    await auth.signOut();
    onToast('Вышел из аккаунта');
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-title">Аккаунт и синхронизация</div>

        {auth.user ? (
          <>
            <div className="sheet-sub">
              Вошёл как {auth.user.email}. Данные хранятся в облаке — доступны на телефоне и компьютере,
              не пропадут при чистке браузера.
            </div>
            <button className="btn-primary" onClick={sync} disabled={busy}>
              {busy ? 'Синхронизация…' : 'Синхронизировать сейчас'}
            </button>
            <button className="sheet-close" onClick={logout}>
              Выйти
            </button>
          </>
        ) : sent ? (
          <>
            <div className="sheet-sub">
              Отправил ссылку для входа на {email.trim()}. Открой письмо на этом устройстве и перейди по
              ссылке — вернёшься сюда уже в аккаунте.
            </div>
            <button className="sheet-close" onClick={onClose}>
              Понятно
            </button>
          </>
        ) : (
          <>
            <div className="sheet-sub">
              Войди по ссылке на почту (без пароля) — тренировки будут храниться в облаке и
              синхронизироваться между устройствами.
            </div>
            <label className="calc-field">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="твоя@почта.ру"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (err) setErr('');
                }}
              />
            </label>
            {err && <span className="music-err">{err}</span>}
            <button className="btn-primary" onClick={login} disabled={busy}>
              {busy ? 'Отправляю…' : 'Войти по ссылке'}
            </button>
            <button className="sheet-close" onClick={onClose}>
              Позже
            </button>
          </>
        )}
      </div>
    </div>
  );
}
