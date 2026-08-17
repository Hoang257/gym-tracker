import { useMemo, useState } from 'react';
import type { Store } from '../lib/useStore';
import type { MuscleGroup, BodyMeasurement } from '../lib/types';
import { allMuscleVolume, volumeStatus, VOLUME_TARGET, MUSCLE_LABEL } from '../lib/volume';
import { weekStart, localDate, formatDate } from '../lib/date';

// Заливка тепловой карты: sequential от «пусто» к энергии по числу эффективных подходов.
function heatFill(sets: number): string {
  if (sets <= 0) return 'var(--surface-3)';
  if (sets < 7) return 'color-mix(in srgb, var(--accent) 45%, var(--surface-3))';
  if (sets < VOLUME_TARGET.high) return 'var(--accent)';
  return 'var(--energy)';
}

const STATUS_LABEL = { low: 'мало', ok: 'норма', high: 'много' } as const;

interface ZoneShape {
  g: MuscleGroup;
  el: 'rect' | 'ellipse';
  d: Record<string, number>;
}

const FRONT: ZoneShape[] = [
  { g: 'delts_front', el: 'ellipse', d: { cx: 39, cy: 34, rx: 7, ry: 6 } },
  { g: 'delts_front', el: 'ellipse', d: { cx: 81, cy: 34, rx: 7, ry: 6 } },
  { g: 'chest', el: 'rect', d: { x: 45, y: 30, width: 13, height: 13, rx: 3 } },
  { g: 'chest', el: 'rect', d: { x: 62, y: 30, width: 13, height: 13, rx: 3 } },
  { g: 'biceps', el: 'ellipse', d: { cx: 33, cy: 46, rx: 5, ry: 8 } },
  { g: 'biceps', el: 'ellipse', d: { cx: 87, cy: 46, rx: 5, ry: 8 } },
  { g: 'abs', el: 'rect', d: { x: 50, y: 46, width: 20, height: 26, rx: 4 } },
  { g: 'forearms', el: 'ellipse', d: { cx: 30, cy: 62, rx: 4, ry: 8 } },
  { g: 'forearms', el: 'ellipse', d: { cx: 90, cy: 62, rx: 4, ry: 8 } },
  { g: 'quads', el: 'rect', d: { x: 46, y: 86, width: 12, height: 32, rx: 5 } },
  { g: 'quads', el: 'rect', d: { x: 62, y: 86, width: 12, height: 32, rx: 5 } },
];

const BACK: ZoneShape[] = [
  { g: 'delts_rear', el: 'ellipse', d: { cx: 39, cy: 34, rx: 7, ry: 6 } },
  { g: 'delts_rear', el: 'ellipse', d: { cx: 81, cy: 34, rx: 7, ry: 6 } },
  { g: 'back_mid', el: 'rect', d: { x: 46, y: 30, width: 28, height: 14, rx: 3 } },
  { g: 'back_lats', el: 'rect', d: { x: 44, y: 45, width: 14, height: 20, rx: 4 } },
  { g: 'back_lats', el: 'rect', d: { x: 62, y: 45, width: 14, height: 20, rx: 4 } },
  { g: 'triceps', el: 'ellipse', d: { cx: 33, cy: 46, rx: 5, ry: 8 } },
  { g: 'triceps', el: 'ellipse', d: { cx: 87, cy: 46, rx: 5, ry: 8 } },
  { g: 'glutes', el: 'rect', d: { x: 46, y: 68, width: 28, height: 14, rx: 5 } },
  { g: 'hamstrings', el: 'rect', d: { x: 46, y: 86, width: 12, height: 24, rx: 5 } },
  { g: 'hamstrings', el: 'rect', d: { x: 62, y: 86, width: 12, height: 24, rx: 5 } },
  { g: 'calves', el: 'rect', d: { x: 47, y: 116, width: 10, height: 22, rx: 5 } },
  { g: 'calves', el: 'rect', d: { x: 63, y: 116, width: 10, height: 22, rx: 5 } },
];

function Silhouette({ zones, heat, title }: { zones: ZoneShape[]; heat: Map<MuscleGroup, number>; title: string }) {
  return (
    <div className="silhouette">
      <svg viewBox="0 0 120 150" role="img" aria-label={`Нагрузка, ${title}`}>
        {/* подложка тела */}
        <g fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1">
          <circle cx="60" cy="15" r="9" />
          <rect x="42" y="26" width="36" height="48" rx="8" />
          <rect x="27" y="28" width="10" height="40" rx="5" />
          <rect x="83" y="28" width="10" height="40" rx="5" />
          <rect x="45" y="74" width="14" height="66" rx="6" />
          <rect x="61" y="74" width="14" height="66" rx="6" />
        </g>
        {/* мышечные зоны по интенсивности */}
        {zones.map((z, i) => {
          const fill = heatFill(heat.get(z.g) ?? 0);
          return z.el === 'rect' ? (
            <rect key={i} {...z.d} fill={fill} opacity="0.92" />
          ) : (
            <ellipse key={i} {...z.d} fill={fill} opacity="0.92" />
          );
        })}
      </svg>
      <span className="silhouette-cap">{title}</span>
    </div>
  );
}

type MeasureDraft = { weight: string; bodyFatPct: string; muscleMass: string; bodyWater: string; visceralFat: string; note: string };
const EMPTY_MEASURE: MeasureDraft = { weight: '', bodyFatPct: '', muscleMass: '', bodyWater: '', visceralFat: '', note: '' };

const MEASURE_FIELDS: { key: keyof MeasureDraft; label: string; unit: string; mode: 'decimal' | 'text' }[] = [
  { key: 'weight', label: 'Вес', unit: 'кг', mode: 'decimal' },
  { key: 'bodyFatPct', label: 'Жир', unit: '%', mode: 'decimal' },
  { key: 'muscleMass', label: 'Мышечная масса', unit: 'кг', mode: 'decimal' },
  { key: 'bodyWater', label: 'Вода', unit: 'л', mode: 'decimal' },
  { key: 'visceralFat', label: 'Висцеральный жир', unit: 'ур.', mode: 'decimal' },
];

const parseNum = (s: string): number | undefined => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
};

function BodyMeasureSheet({ onSave, onClose }: { onSave: (m: Omit<BodyMeasurement, keyof import('../lib/types').SyncMeta | 'ts'>) => void; onClose: () => void }) {
  const [f, setF] = useState<MeasureDraft>(EMPTY_MEASURE);
  const upd = (k: keyof MeasureDraft, v: string) => setF((s) => ({ ...s, [k]: v }));

  const save = () => {
    const m = {
      date: localDate(),
      source: 'manual' as const,
      weight: parseNum(f.weight),
      bodyFatPct: parseNum(f.bodyFatPct),
      muscleMass: parseNum(f.muscleMass),
      bodyWater: parseNum(f.bodyWater),
      visceralFat: parseNum(f.visceralFat),
      note: f.note.trim() || undefined,
    };
    if (m.weight === undefined && m.bodyFatPct === undefined && m.muscleMass === undefined && m.bodyWater === undefined && m.visceralFat === undefined) {
      onClose();
      return;
    }
    onSave(m);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-title">Замер тела</div>
        <div className="sheet-sub">Впиши показатели с распечатки InBody. Пустые поля пропускаются.</div>

        <div className="measure-grid">
          {MEASURE_FIELDS.map((mf) => (
            <label className="measure-field" key={mf.key}>
              <span className="measure-label">{mf.label}</span>
              <span className="measure-input">
                <input inputMode="decimal" placeholder="—" value={f[mf.key]} onChange={(e) => upd(mf.key, e.target.value)} />
                <span className="measure-u">{mf.unit}</span>
              </span>
            </label>
          ))}
        </div>

        <button className="btn-primary" onClick={save}>Сохранить замер</button>
        <button className="sheet-close" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

const MetricTile = ({ label, value, unit, delta, goodDown }: { label: string; value?: number; unit: string; delta: number | null; goodDown?: boolean }) => {
  if (value === undefined) return null;
  const dir = delta === null || delta === 0 ? 'flat' : (goodDown ? delta < 0 : delta > 0) ? 'up' : 'down';
  return (
    <div className="metric-tile">
      <div className="metric-v">{value}<small>{unit}</small></div>
      <div className="metric-k">{label}</div>
      {delta !== null && delta !== 0 && (
        <div className={`metric-d ${dir}`}>{delta > 0 ? `+${delta}` : delta}</div>
      )}
    </div>
  );
};

function BodyGoal({ store }: { store: Store }) {
  const [target, setTarget] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const bodySorted = useMemo(() => [...store.body].sort((a, b) => b.ts - a.ts), [store.body]);
  const goal = store.goals.find((g) => g.kind === 'bodyweight');

  // Последнее значение показателя и дельта к предыдущему замеру, где он был задан.
  const metric = (key: keyof BodyMeasurement) => {
    const vals = bodySorted.filter((b) => b[key] !== undefined);
    if (vals.length === 0) return { cur: undefined, delta: null as number | null };
    const cur = vals[0][key] as number;
    const prev = vals[1]?.[key] as number | undefined;
    return { cur, delta: prev !== undefined ? +(cur - prev).toFixed(1) : null };
  };

  const w = metric('weight');
  const fat = metric('bodyFatPct');
  const muscle = metric('muscleMass');
  const current = w.cur;

  const saveMeasure = (m: Omit<BodyMeasurement, keyof import('../lib/types').SyncMeta | 'ts'>) => {
    store.addBody(m);
    if (goal && goal.start === undefined && m.weight !== undefined) {
      store.saveGoal({ id: goal.id, kind: 'bodyweight', target: goal.target, start: m.weight });
    }
  };

  const setGoalWeight = () => {
    const t = parseNum(target);
    if (t === undefined || t <= 0) return;
    store.saveGoal({ id: goal?.id, kind: 'bodyweight', target: t, start: goal?.start ?? current });
    setTarget('');
  };

  let progress: number | null = null;
  if (goal && current !== undefined && goal.start !== undefined && goal.target !== goal.start) {
    progress = Math.max(0, Math.min(1, (current - goal.start) / (goal.target - goal.start)));
  }

  const history = bodySorted.slice(0, 5);

  return (
    <div className="body-card">
      <div className="body-top">
        <div>
          <div className="body-cur">
            {current !== undefined ? current : '—'}
            <small>кг</small>
            {w.delta !== null && w.delta !== 0 && (
              <span className={`body-cur-d ${w.delta > 0 ? 'up' : 'down'}`}>{w.delta > 0 ? `+${w.delta}` : w.delta}</span>
            )}
          </div>
          <div className="body-cur-k">Текущий вес</div>
        </div>
        {goal && <div className="body-goal-badge">цель {goal.target} кг</div>}
      </div>

      {progress !== null && goal && (
        <div className="goal-track-wrap">
          <div className="goal-track">
            <div className="goal-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="goal-marks">
            <span>{goal.start} кг</span>
            <span>{Math.round(progress * 100)}%</span>
            <span>{goal.target} кг</span>
          </div>
        </div>
      )}

      {(fat.cur !== undefined || muscle.cur !== undefined) && (
        <div className="body-metrics">
          <MetricTile label="Жир" value={fat.cur} unit="%" delta={fat.delta} goodDown />
          <MetricTile label="Мышцы" value={muscle.cur} unit="кг" delta={muscle.delta} />
        </div>
      )}

      <div className="body-inputs">
        <button className="body-measure-btn" onClick={() => setSheetOpen(true)}>＋ замер InBody</button>
        <label className="body-field">
          <input inputMode="decimal" placeholder={goal ? 'Новая цель' : 'Задать цель'} value={target} onChange={(e) => setTarget(e.target.value)} />
          <button className="body-btn" onClick={setGoalWeight}>цель</button>
        </label>
      </div>

      {history.length > 0 && (
        <div className="body-history">
          {history.map((b) => (
            <div className="body-hist-row" key={b.id}>
              <span className="body-hist-date">{formatDate(b.date)}</span>
              <span className="body-hist-vals">
                {b.weight !== undefined && <b>{b.weight} кг</b>}
                {b.bodyFatPct !== undefined && <span>{b.bodyFatPct}% жир</span>}
                {b.muscleMass !== undefined && <span>{b.muscleMass} кг мышц</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="body-note">Фото-распознавание InBody добавится с облачной синхронизацией — оно просто заполнит эту же форму.</p>

      {sheetOpen && <BodyMeasureSheet onSave={saveMeasure} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

export function OverviewView({ store }: { store: Store }) {
  // Один проход по истории: тепловая карта и бары объема выводятся из общей карты.
  const heat = useMemo(() => allMuscleVolume(store.history, weekStart()), [store.history]);
  const volume = useMemo(
    () =>
      [...heat.entries()]
        .filter(([, sets]) => sets > 0)
        .map(([group, sets]) => ({ group, label: MUSCLE_LABEL[group], sets }))
        .sort((a, b) => b.sets - a.sets),
    [heat],
  );
  const maxSets = Math.max(VOLUME_TARGET.high, ...volume.map((v) => v.sets), 1);

  return (
    <div className="list">
      <div className="section-label">Тело и цель</div>
      <BodyGoal store={store} />

      <div className="section-label">Нагрузка мышц за неделю</div>
      <div className="heat-row">
        <Silhouette zones={FRONT} heat={heat} title="Спереди" />
        <Silhouette zones={BACK} heat={heat} title="Сзади" />
      </div>
      <div className="heat-legend">
        <span className="heat-dot" style={{ background: heatFill(0) }} /> нет
        <span className="heat-dot" style={{ background: heatFill(5) }} /> мало
        <span className="heat-dot" style={{ background: heatFill(10) }} /> норма
        <span className="heat-dot" style={{ background: heatFill(20) }} /> много
      </div>

      {volume.length === 0 ? (
        <div className="empty">
          Проведи тренировку — здесь появится объем по группам мышц и тепловая карта нагрузки за неделю.
        </div>
      ) : (
        <>
          <div className="section-label">Объем по группам (эффективных подходов)</div>
          <div className="vol-list">
            {volume.map((v) => {
              const status = volumeStatus(v.sets);
              const pct = Math.min(100, (v.sets / maxSets) * 100);
              const lo = (VOLUME_TARGET.low / maxSets) * 100;
              const hi = (VOLUME_TARGET.high / maxSets) * 100;
              return (
                <div className="vol-row" key={v.group}>
                  <div className="vol-head">
                    <span className="vol-name">{v.label}</span>
                    <span className={`vol-status ${status}`}>
                      {v.sets} · {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <div className="vol-track">
                    <div className="vol-zone" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                    <div className="vol-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="vol-hint">Зеленая зона на дорожке — ориентир {VOLUME_TARGET.low}–{VOLUME_TARGET.high} подходов в неделю на группу.</p>
        </>
      )}
    </div>
  );
}

export { MUSCLE_LABEL };
