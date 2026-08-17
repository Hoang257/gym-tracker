import { useState } from 'react';
import type { Store } from '../lib/useStore';
import { parsePlan, PROMPT_TEMPLATE } from '../lib/planImport';

interface Props {
  store: Store;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'prompt' | 'paste';

export function ImportPlan({ store, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('prompt');
  const [json, setJson] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErrors(['Не удалось скопировать. Выделите текст вручную.']);
    }
  };

  const doImport = () => {
    const outcome = parsePlan(json, store.repo.userId, store.catalog);
    if (!outcome.ok || !outcome.result) {
      setErrors(outcome.errors);
      return;
    }
    const { program, exercises } = outcome.result;
    store.importPlan(program, exercises);
    onImported();
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-tall" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-title">Импорт плана</div>
        <div className="sheet-sub">Пусть нейросеть составит программу, а приложение сделает из нее дневник</div>

        <div className="seg">
          <button className={`seg-btn${step === 'prompt' ? ' active' : ''}`} onClick={() => setStep('prompt')}>
            1 · Промпт
          </button>
          <button className={`seg-btn${step === 'paste' ? ' active' : ''}`} onClick={() => setStep('paste')}>
            2 · Вставить ответ
          </button>
        </div>

        {step === 'prompt' ? (
          <>
            <p className="import-hint">
              Скопируйте промпт, вставьте в ChatGPT или Claude, допишите свою цель и данные в квадратных
              скобках. Нейросеть вернет JSON — его вставите на шаге 2.
            </p>
            <pre className="prompt-box">{PROMPT_TEMPLATE}</pre>
            <div className="import-actions">
              <button className="btn-primary" onClick={copyPrompt}>
                {copied ? 'Скопировано ✓' : 'Скопировать промпт'}
              </button>
              <button className="btn-ghost" onClick={() => setStep('paste')}>
                Дальше →
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="import-hint">Вставьте JSON-ответ нейросети целиком.</p>
            <textarea
              className="paste-box"
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                if (errors.length) setErrors([]);
              }}
              placeholder={'{\n  "name": "...",\n  "days": [ ... ]\n}'}
              spellCheck={false}
            />
            {errors.length > 0 && (
              <div className="import-errors">
                <div className="import-errors-title">Не получилось разобрать план:</div>
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="import-actions">
              <button className="btn-primary" onClick={doImport} disabled={!json.trim()}>
                Создать дневник
              </button>
              <button className="btn-ghost" onClick={() => setStep('prompt')}>
                ← Назад
              </button>
            </div>
            <p className="import-warn">Импорт заменит текущую программу. История тренировок сохранится.</p>
          </>
        )}

        <button className="sheet-close" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}
