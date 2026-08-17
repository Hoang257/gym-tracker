import type { RestTimer as Timer } from '../lib/useRestTimer';

const R = 20;
const CIRC = 2 * Math.PI * R;

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimer({ timer }: { timer: Timer }) {
  if (!timer.active) return null;

  const frac = timer.total > 0 ? timer.remaining / timer.total : 0;
  const offset = CIRC * (1 - frac);
  const ending = timer.remaining <= 5;

  return (
    <div className={`rest-timer${ending ? ' ending' : ''}`}>
      <div className="rt-ring-wrap">
        <svg className="rt-ring" viewBox="0 0 44 44" aria-hidden="true">
          <circle className="rt-bg" cx="22" cy="22" r={R} />
          <circle
            className="rt-fg"
            cx="22"
            cy="22"
            r={R}
            style={{ strokeDasharray: CIRC, strokeDashoffset: offset }}
          />
        </svg>
        <span className="rt-num">{fmt(timer.remaining)}</span>
      </div>
      <div className="rt-mid">
        <div className="rt-title">Отдых</div>
        <div className="rt-cap">{timer.label}</div>
      </div>
      <div className="rt-btns">
        <button className="rt-btn" onClick={() => timer.add(15)} aria-label="Добавить 15 секунд">
          +15
        </button>
        <button className="rt-btn skip" onClick={timer.stop} aria-label="Пропустить отдых">
          Пропустить
        </button>
      </div>
    </div>
  );
}
