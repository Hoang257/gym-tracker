import type { ResolvedExercise, SetEntry } from '../lib/types';
import { summarizeSets, suggestionText } from '../lib/progress';

interface Props {
  ex: ResolvedExercise;
  sets: SetEntry[];
  done: boolean;
  doneSets: boolean[];
  isPR?: boolean;
  lastSets: SetEntry[] | null;
  onCell: (idx: number, field: keyof SetEntry, value: string) => void;
  onToggle: () => void;
  onToggleSet: (idx: number) => void;
  onAddSet: () => void;
  onRemoveSet: (idx: number) => void;
  onStartRest: () => void;
  onRepeatLast?: () => void;
  onOpenCalc?: () => void;
}

export function ExerciseCard({
  ex, sets, done, doneSets, isPR, lastSets, onCell, onToggle, onToggleSet, onAddSet, onRemoveSet, onStartRest, onRepeatLast, onOpenCalc,
}: Props) {
  const target = ex.unit === 'sec' ? `${ex.sets} × ${ex.low}–${ex.high} с` : `${ex.sets} × ${ex.low}–${ex.high}`;
  const last = summarizeSets(ex.unit, lastSets);
  const sugg = suggestionText(ex, lastSets);
  const isSec = ex.unit === 'sec';

  return (
    <div className={`card${done ? ' done' : ''}`}>
      <div className="card-head">
        <button
          className={`check${done ? ' on' : ''}`}
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? 'Отменить выполнение' : 'Отметить выполненным'}
        >
          ✓
        </button>
        <div className="card-info">
          <div className="ex-row">
            <h2 className="ex-name">{ex.name}</h2>
            {isPR && (
              <span className="pr-badge">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" />
                </svg>
                Рекорд
              </span>
            )}
            {ex.videoUrl && /^https?:\/\//i.test(ex.videoUrl) && (
              <a
                className="video-link"
                href={ex.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Техника: ${ex.name}`}
                title="Посмотреть технику"
              >
                ▶ техника
              </a>
            )}
          </div>
          <span className="ex-target">{target}</span>
          {ex.hint && <span className="ex-hint">{ex.hint}</span>}
          {last && <span className="ex-last">прошлый раз: {last}</span>}
          {sugg && <span className="ex-sugg">↗ {sugg}</span>}
        </div>
      </div>

      <div className="sets">
        {sets.map((s, i) => (
          <div
            className={`set${doneSets[i] ? ' set-done' : ''}`}
            key={i}
            style={{ gridTemplateColumns: isSec ? '26px 1fr 40px' : '26px 1fr 1fr 40px' }}
          >
            <span className="set-n">{i + 1}</span>
            {!isSec && (
              <label className="field">
                <input
                  inputMode="decimal"
                  aria-label={`${ex.name}, подход ${i + 1}, ${ex.unit === 'bw' ? 'доп. вес, кг' : 'вес, кг'}`}
                  placeholder={ex.unit === 'bw' ? 'свой' : 'кг'}
                  value={s.w}
                  onChange={(e) => onCell(i, 'w', e.target.value)}
                />
                <span className="u">{ex.unit === 'bw' ? '+кг' : 'кг'}</span>
              </label>
            )}
            <label className="field">
              <input
                inputMode="numeric"
                aria-label={`${ex.name}, подход ${i + 1}, ${isSec ? 'секунды' : 'повторы'}`}
                placeholder={isSec ? 'сек' : 'повт'}
                value={s.r}
                onChange={(e) => onCell(i, 'r', e.target.value)}
              />
              <span className="u">{isSec ? 'с' : '×'}</span>
            </label>
            <button
              className={`set-check${doneSets[i] ? ' on' : ''}`}
              onClick={() => onToggleSet(i)}
              aria-pressed={!!doneSets[i]}
              aria-label={`Подход ${i + 1} ${doneSets[i] ? 'выполнен, отменить' : 'отметить выполненным'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="set-tools">
        <div className="set-tools-left">
          <button className="mini-btn" onClick={onAddSet}>
            + подход
          </button>
          {sets.length > 1 && (
            <button className="mini-btn" onClick={() => onRemoveSet(sets.length - 1)}>
              − подход
            </button>
          )}
          {onRepeatLast && lastSets && (
            <button className="mini-btn" onClick={onRepeatLast} title="Заполнить как в прошлый раз">
              ↻ прошлое
            </button>
          )}
        </div>
        <div className="set-tools-right">
          {onOpenCalc && (
            <button className="rest-btn" onClick={onOpenCalc} aria-label="Калькулятор блинов">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
              </svg>
              блины
            </button>
          )}
          <button className="rest-btn" onClick={onStartRest} aria-label="Запустить отдых">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2 2M9 2h6" />
            </svg>
            отдых
          </button>
        </div>
      </div>
    </div>
  );
}
