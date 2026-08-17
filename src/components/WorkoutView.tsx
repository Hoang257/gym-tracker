import { useEffect, useMemo, useState } from 'react';
import { todayDayId, nextDayId } from '../data/program';
import { scheduleLabel } from '../lib/date';
import { lastSession, lastSetsFor, metric, tonnage, workingSets } from '../lib/progress';
import type { Store } from '../lib/useStore';
import type { RestTimer } from '../lib/useRestTimer';
import { ExerciseCard } from './ExerciseCard';

interface Props {
  store: Store;
  date: string;
  timer: RestTimer;
  onOpenCalc: (weight?: string) => void;
}

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

/** Последний непустой введенный вес подхода — для предзаполнения калькулятора. */
function lastEnteredWeight(sets: { w: string }[]): string {
  for (let i = sets.length - 1; i >= 0; i--) {
    if (sets[i].w) return sets[i].w;
  }
  return '';
}

export function WorkoutView({ store, date, timer, onOpenCalc }: Props) {
  const { program } = store;
  const [day, setDay] = useState<string>(() => todayDayId(program) ?? nextDayId(program));
  const [toast, setToast] = useState<string | null>(null);

  // Показываемый день: если выбранного нет в программе (напр. после импорта плана
  // все id сменились) — берем первый. И черновик, и рендер работают с этим id.
  const currentDayId = program.days.some((d) => d.id === day) ? day : (program.days[0]?.id ?? day);

  useEffect(() => {
    store.ensureDraft(date, currentDayId);
  }, [date, currentDayId, store]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Максимальная метрика по каждому упражнению из истории — считаем один раз,
  // а не перебираем всю историю на каждый ввод символа.
  const prMax = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of store.history) {
      for (const log of s.logs) {
        const m = metric(log.unit, log.sets);
        if (m === null) continue;
        const cur = map.get(log.exerciseId);
        if (cur === undefined || m > cur) map.set(log.exerciseId, m);
      }
    }
    return map;
  }, [store.history]);

  if (program.days.length === 0) {
    return (
      <div className="empty">
        В программе нет тренировочных дней. Импортируйте план от нейросети или добавьте день вручную.
      </div>
    );
  }

  const currentDay = program.days.find((d) => d.id === currentDayId) ?? program.days[0];
  const exercises = store.exercisesFor(currentDay.id);
  const draft = store.getDraft(date, currentDay.id);
  const prev = lastSession(store.history, currentDay.id);

  const doneCount = exercises.filter((e) => draft.done[e.exerciseId]).length;
  const total = exercises.length;
  const isRest = todayDayId(program) === null;
  const accent = `var(--${currentDay.accent ?? 'accent'})`;

  // Живые мини-статы дня из введенных данных.
  let dayTonnage = 0;
  let dayWorkingSets = 0;
  for (const ex of exercises) {
    const sets = draft.sets[ex.exerciseId] ?? [];
    dayTonnage += tonnage(ex.unit, sets);
    dayWorkingSets += workingSets(sets);
  }

  const ringFrac = total > 0 ? doneCount / total : 0;
  const ringOffset = RING_C * (1 - ringFrac);

  const finish = () => {
    store.finishWorkout(date, currentDay.id);
    setToast(`${currentDay.title} — записано ✓`);
  };

  return (
    <>
      <div className="day-picker">
        {program.days.map((d) => (
          <button
            key={d.id}
            className={`day-chip${d.id === currentDay.id ? ' active' : ''}`}
            style={{ ['--dc' as string]: `var(--${d.accent ?? 'accent'})` }}
            onClick={() => setDay(d.id)}
          >
            {d.title.split('·').pop()?.trim() ?? d.title}
          </button>
        ))}
      </div>

      <div className="wk-head" style={{ ['--day' as string]: accent }}>
        <div className="wk-head-top">
          <div className="wk-head-text">
            <span className="wk-eyebrow">
              {isRest ? 'Сегодня отдых · выбрана тренировка' : 'Сегодня'}
              {currentDay.schedule && ` · ${scheduleLabel(currentDay.schedule.weekday, currentDay.schedule.time)}`}
            </span>
            <span className="wk-title">{currentDay.title}</span>
            {currentDay.subtitle && <span className="wk-sub">{currentDay.subtitle}</span>}
          </div>
          <div className="ring-wrap">
            <svg className="ring" viewBox="0 0 60 60" aria-hidden="true">
              <circle className="ring-bg" cx="30" cy="30" r={RING_R} />
              <circle
                className="ring-fg"
                cx="30"
                cy="30"
                r={RING_R}
                style={{ strokeDasharray: RING_C, strokeDashoffset: ringOffset, stroke: accent }}
              />
            </svg>
            <span className="ring-label">{doneCount}/{total}</span>
          </div>
        </div>
        <div className="wk-stats">
          <div className="wk-stat">
            <span className="wk-stat-v">
              {dayTonnage >= 1000 ? (dayTonnage / 1000).toFixed(1) : Math.round(dayTonnage)}
              <small>{dayTonnage >= 1000 ? 'т' : 'кг'}</small>
            </span>
            <span className="wk-stat-k">Тоннаж</span>
          </div>
          <div className="wk-stat">
            <span className="wk-stat-v">{dayWorkingSets}</span>
            <span className="wk-stat-k">Подходов</span>
          </div>
          <div className="wk-stat">
            <span className="wk-stat-v">{doneCount}<small>/{total}</small></span>
            <span className="wk-stat-k">Готово</span>
          </div>
        </div>
      </div>

      <div className="list">
        {exercises.map((ex) => {
          const sets = draft.sets[ex.exerciseId] ?? [];
          const done = !!draft.done[ex.exerciseId];
          const m = metric(ex.unit, sets);
          const best = prMax.get(ex.exerciseId);
          const isPR = done && m !== null && (best === undefined || m > best);
          return (
            <ExerciseCard
              key={ex.exerciseId}
              ex={ex}
              sets={sets}
              done={done}
              isPR={isPR}
              lastSets={lastSetsFor(prev, ex.exerciseId)}
              onCell={(idx, field, value) => store.setCell(date, currentDay.id, ex.exerciseId, idx, field, value)}
              onToggle={() => store.toggleDone(date, currentDay.id, ex.exerciseId)}
              onAddSet={() => store.addSet(date, currentDay.id, ex.exerciseId)}
              onRemoveSet={(idx) => store.removeSet(date, currentDay.id, ex.exerciseId, idx)}
              onStartRest={() => timer.start(ex.rest ?? store.settings.defaultRest, ex.name)}
              onOpenCalc={ex.unit === 'kg' ? () => onOpenCalc(lastEnteredWeight(sets)) : undefined}
            />
          );
        })}
      </div>

      <div className="finish-bar">
        <button className="finish-btn" onClick={finish} disabled={doneCount === 0}>
          Завершить <span className="finish-count">{doneCount}/{total}</span>
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
