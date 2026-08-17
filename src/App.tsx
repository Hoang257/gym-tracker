import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './lib/useStore';
import { useRestTimer } from './lib/useRestTimer';
import { localDate, daysAgo } from './lib/date';
import { exportBundle, parseImport } from './lib/storage';
import { migrateSessions } from './lib/migrate';
import { mergeById, countOverlap } from './lib/merge';
import type { Session } from './lib/types';
import { WorkoutView } from './components/WorkoutView';
import { HistoryView } from './components/HistoryView';
import { OverviewView } from './components/OverviewView';
import { RestTimer } from './components/RestTimer';
import { PlateCalculator } from './components/PlateCalculator';
import { ImportPlan } from './components/ImportPlan';
import { Onboarding } from './components/Onboarding';
import { useSwipe } from './lib/useSwipe';

type Tab = 'workout' | 'overview' | 'history';
const TAB_ORDER: Tab[] = ['workout', 'overview', 'history'];
type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'gt_theme';
const ONBOARD_KEY = 'gt_onboarded_v1';
const BACKUP_TS_KEY = 'gt_last_backup';
const BACKUP_STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('workout');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || 'system');
  const [calc, setCalc] = useState<{ open: boolean; weight: string }>({ open: false, weight: '' });
  const [importOpen, setImportOpen] = useState(false);
  const [onboard, setOnboard] = useState(() => localStorage.getItem(ONBOARD_KEY) !== '1');
  const [lastBackup, setLastBackup] = useState(() => Number(localStorage.getItem(BACKUP_TS_KEY) || 0));
  const [toast, setToast] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    bundle: ReturnType<typeof parseImport>;
    sessions: Session[];
    overlap: number;
    isV1: boolean;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const closeOnboard = () => {
    setOnboard(false);
    localStorage.setItem(ONBOARD_KEY, '1');
  };

  const swipeTab = (dir: number) =>
    setTab((cur) => {
      const i = TAB_ORDER.indexOf(cur) + dir;
      return i >= 0 && i < TAB_ORDER.length ? TAB_ORDER[i] : cur;
    });
  const tabSwipe = useSwipe<HTMLElement>(() => swipeTab(1), () => swipeTab(-1));
  const date = localDate();
  const timer = useRestTimer({ sound: store.settings.sound, vibrate: store.settings.vibrate });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Просим браузер не вычищать хранилище (iOS чистит через 7 дней без визитов).
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!importPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImportPreview(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [importPreview]);

  const needsBackup = store.history.length > 0 && Date.now() - lastBackup > BACKUP_STALE_MS;

  const streak = useMemo(() => store.history.filter((s) => daysAgo(s.date) < 7).length, [store.history]);

  const cycleTheme = () => setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'));
  const themeIcon = theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '◐';

  const doExport = () => {
    const blob = new Blob([exportBundle(store.repo.userId)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const now = Date.now();
    localStorage.setItem(BACKUP_TS_KEY, String(now));
    setLastBackup(now);
  };

  // Только читаем файл и показываем сводку — ничего не заменяем без подтверждения.
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bundle = parseImport(String(reader.result));
        const isV1 = bundle.version === 1;
        const sessions = isV1
          ? migrateSessions(bundle.sessions as never[], store.repo.userId)
          : bundle.sessions ?? [];
        setImportPreview({ bundle, sessions, overlap: countOverlap(store.history, sessions), isV1 });
      } catch {
        setToast('Не удалось прочитать файл резервной копии');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const applyImport = (mode: 'replace' | 'merge') => {
    if (!importPreview) return;
    const { bundle, sessions, isV1 } = importPreview;
    if (!isV1) {
      if (bundle.program) store.updateProgram(bundle.program);
      if (bundle.settings) store.updateSettings(bundle.settings);
      bundle.body?.forEach((b) => store.repo.putBody(b));
      bundle.goals?.forEach((g) => store.repo.putGoal(g));
    }
    const next = mode === 'merge' ? mergeById(store.history, sessions) : sessions;
    store.replaceHistory(next);
    setImportPreview(null);
    setToast(mode === 'merge' ? `Объединено · в истории ${next.length}` : `Заменено · в истории ${next.length}`);
  };

  return (
    <div className="app">
      <header className="top">
        <div className="top-row">
          <span className="brand">Дневник зала</span>
          <div className="top-right">
            {streak > 0 && (
              <span className="streak" title="Тренировок за неделю">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
                </svg>
                {streak}
              </span>
            )}
            <button className="icon-btn" onClick={() => setImportOpen(true)} aria-label="Импорт плана от нейросети">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12M8 11l4 4 4-4M5 21h14" />
              </svg>
            </button>
            <button className="icon-btn" onClick={() => setCalc({ open: true, weight: '' })} aria-label="Калькулятор блинов">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
              </svg>
            </button>
            <button className="icon-btn" onClick={() => setOnboard(true)} aria-label="Как пользоваться">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.9.4-1.2 1-1.2 1.9M12 17h.01" />
              </svg>
            </button>
            <button className="icon-btn" onClick={cycleTheme} aria-label="Сменить тему">
              {themeIcon}
            </button>
          </div>
        </div>
      </header>

      <main className="swipe-area" ref={tabSwipe}>
      <div className="tab-content" key={tab}>
      {tab === 'workout' && (
        <WorkoutView store={store} date={date} timer={timer} onOpenCalc={(weight = '') => setCalc({ open: true, weight })} />
      )}
      {tab === 'overview' && <OverviewView store={store} />}
      {tab === 'history' && (
        <>
          <HistoryView store={store} />
          {needsBackup && (
            <button className="backup-note" onClick={doExport}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              <span>Данные хранятся только на этом устройстве. Нажмите, чтобы сделать резервную копию.</span>
            </button>
          )}
          <div className="tools-row">
            <button className="ghost-btn" onClick={doExport}>
              Экспорт данных
            </button>
            <button className="ghost-btn" onClick={() => fileRef.current?.click()}>
              Импорт бэкапа
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              onChange={onImportFile}
              style={{ display: 'none' }}
            />
          </div>
          <button className="help-cta" onClick={() => setOnboard(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.9.4-1.2 1-1.2 1.9M12 17h.01" />
            </svg>
            Как пользоваться приложением
          </button>
        </>
      )}
      </div>
      </main>

      <RestTimer timer={timer} />

      <nav className="tabbar">
        <button className={`tabbar-btn${tab === 'workout' ? ' active' : ''}`} aria-current={tab === 'workout' ? 'page' : undefined} onClick={() => setTab('workout')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7v10M7 5v14M17 5v14M20 7v10M7 12h10" />
          </svg>
          Тренировка
        </button>
        <button className={`tabbar-btn${tab === 'overview' ? ' active' : ''}`} aria-current={tab === 'overview' ? 'page' : undefined} onClick={() => setTab('overview')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19V5M4 19h16M8 19v-6M12 19V9M16 19v-9" />
          </svg>
          Обзор
        </button>
        <button className={`tabbar-btn${tab === 'history' ? ' active' : ''}`} aria-current={tab === 'history' ? 'page' : undefined} onClick={() => setTab('history')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          История
        </button>
      </nav>

      {calc.open && (
        <PlateCalculator
          settings={store.settings}
          initialWeight={calc.weight}
          onClose={() => setCalc((c) => ({ ...c, open: false }))}
        />
      )}

      {importOpen && (
        <ImportPlan
          store={store}
          onClose={() => setImportOpen(false)}
          onImported={() => setTab('workout')}
        />
      )}

      {onboard && <Onboarding onDone={closeOnboard} />}

      {importPreview && (
        <div className="sheet-backdrop" onClick={() => setImportPreview(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sheet-title">Импорт данных</div>
            <div className="sheet-sub">
              В файле {importPreview.sessions.length} тренировок. Сейчас в приложении {store.history.length}.
              {importPreview.overlap > 0 && ` Совпадают по id: ${importPreview.overlap}.`}
            </div>
            <div className="import-actions">
              <button className="btn-primary" onClick={() => applyImport('merge')}>
                Объединить (добавить недостающие)
              </button>
              <button className="sheet-close danger" onClick={() => applyImport('replace')}>
                Заменить всё
              </button>
              <button className="sheet-close" onClick={() => setImportPreview(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
