import { useState } from 'react';
import type { Settings } from '../lib/types';
import { computePlates, summarizePlates } from '../lib/plates';
import { num } from '../lib/num';
import { useModalDismiss } from '../lib/useModal';

interface Props {
  settings: Settings;
  initialWeight?: string;
  onClose: () => void;
}

export function PlateCalculator({ settings, initialWeight = '', onClose }: Props) {
  const [value, setValue] = useState(initialWeight);
  useModalDismiss(onClose);
  const target = num(value);
  const valid = !Number.isNaN(target) && target > 0;
  const result = valid ? computePlates(target, settings.barWeight, settings.plates) : null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-title">Калькулятор блинов</div>
        <div className="sheet-sub">Гриф {settings.barWeight} кг · блины на сторону</div>

        <label className="calc-field">
          <input
            autoFocus
            inputMode="decimal"
            placeholder="Целевой вес"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <span className="calc-u">кг</span>
        </label>

        {result && (
          <div className="calc-out">
            <div className="calc-plates">
              {result.perSide.length === 0 ? (
                <span className="calc-empty">Только гриф</span>
              ) : (
                result.perSide.map((p, i) => (
                  <span className="plate-chip" key={i}>
                    {p}
                  </span>
                ))
              )}
            </div>
            <div className="calc-summary">
              <span>{summarizePlates(result.perSide)} на сторону</span>
              {!result.exact && (
                <span className="calc-warn">
                  точно не собрать · ближайший {result.achievable} кг
                </span>
              )}
            </div>
          </div>
        )}

        <button className="sheet-close" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}
