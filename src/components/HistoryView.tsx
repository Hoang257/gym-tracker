import { useState } from 'react';
import type { Session, Unit } from '../lib/types';
import { formatDate, daysAgo } from '../lib/date';
import { metric, metricLabel, summarizeSets, estimateOneRepMax } from '../lib/progress';
import type { Store } from '../lib/useStore';
import { Sparkline } from './Sparkline';

interface Props {
  store: Store;
}

interface SeriesRow {
  exerciseId: string;
  name: string;
  unit: Unit;
  dayId: string;
  dayTitle: string;
  accent: string;
  values: number[];
  orm: number | null; // оценка 1ПМ по последней тренировке (kg)
}

/**
 * Прогресс строится из снапшотов в логах, а не из текущей программы:
 * история остается корректной, даже если программу изменили или упражнение убрали.
 */
function buildSeries(history: Session[]): SeriesRow[] {
  const byExercise = new Map<string, SeriesRow>();
  const sorted = [...history].sort((a, b) => a.ts - b.ts);

  for (const s of sorted) {
    for (const log of s.logs) {
      const m = metric(log.unit, log.sets);
      if (m === null) continue;
      const key = `${s.dayId}:${log.exerciseId}`;
      const orm = estimateOneRepMax(log.unit, log.sets);
      const row = byExercise.get(key);
      if (row) {
        row.values.push(m);
        row.orm = orm; // последняя тренировка — самая свежая (sorted по возрастанию)
      } else {
        byExercise.set(key, {
          exerciseId: log.exerciseId,
          name: log.name,
          unit: log.unit,
          dayId: s.dayId,
          dayTitle: s.dayTitle,
          accent: `var(--${s.accent ?? 'accent'})`,
          values: [m],
          orm,
        });
      }
    }
  }
  return [...byExercise.values()];
}

export function HistoryView({ store }: Props) {
  const { history } = store;
  const [open, setOpen] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="empty">
        Пока пусто. Завершишь первую тренировку — здесь появятся графики прогресса и журнал.
      </div>
    );
  }

  const sorted = [...history].sort((a, b) => b.ts - a.ts);
  const last30 = history.filter((s) => daysAgo(s.date) <= 30).length;
  const lastAgo = daysAgo(sorted[0].date);
  const series = buildSeries(history);

  return (
    <div className="list">
      <div className="stats">
        <div className="stat">
          <span className="stat-v">{history.length}</span>
          <span className="stat-k">всего</span>
        </div>
        <div className="stat">
          <span className="stat-v">{last30}</span>
          <span className="stat-k">за 30 дней</span>
        </div>
        <div className="stat">
          <span className="stat-v">{lastAgo === 0 ? 'сегодня' : `${lastAgo} дн`}</span>
          <span className="stat-k">последняя</span>
        </div>
      </div>

      {series.length > 0 && (
        <>
          <div className="section-label">Прогресс по упражнениям</div>
          <div>
            {series.map((row) => {
              const first = row.values[0];
              const cur = row.values[row.values.length - 1];
              const diff = +(cur - first).toFixed(1);
              return (
                <div className="prog-row" key={`${row.dayId}-${row.exerciseId}`}>
                  <div>
                    <div className="prog-name">{row.name}</div>
                    <div className="prog-meta">{row.dayTitle}</div>
                  </div>
                  <div className="prog-right">
                    <Sparkline values={row.values} color={row.accent} />
                    <div style={{ textAlign: 'right' }}>
                      <div className="prog-val">
                        {cur} {metricLabel(row.unit)}
                      </div>
                      {row.orm !== null && <div className="prog-orm">1ПМ ~{row.orm} кг</div>}
                      <div className={`delta ${diff > 0 ? 'up' : 'flat'}`}>
                        {diff > 0 ? `▲ +${diff}` : diff < 0 ? `▼ ${diff}` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="section-label">Журнал</div>
      <div className="list">
        {sorted.map((s) => {
          const expanded = open === s.id;
          const doneCount = s.logs.filter((l) => l.done).length;
          return (
            <div className="log-item" key={s.id}>
              <div
                className="log-head"
                style={{ ['--day' as string]: `var(--${s.accent ?? 'accent'})` }}
                onClick={() => setOpen(expanded ? null : s.id)}
              >
                <span className="log-dot" />
                <span className="log-title">{s.dayTitle}</span>
                <span className="log-date">
                  {formatDate(s.date)} · {doneCount}/{s.logs.length}
                </span>
              </div>
              {expanded && (
                <div className="log-body">
                  {s.logs.map((log) => {
                    const summary = summarizeSets(log.unit, log.sets);
                    return (
                      <div className="log-ex" key={log.exerciseId}>
                        <span className="n">
                          {log.done ? '✓ ' : ''}
                          {log.name}
                        </span>
                        <span className="v">{summary ?? '—'}</span>
                      </div>
                    );
                  })}
                  <button
                    className="del-btn"
                    onClick={() => {
                      if (confirm('Удалить эту тренировку из истории?')) store.deleteSession(s.id);
                    }}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
