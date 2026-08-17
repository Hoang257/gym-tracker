import { useState, type ReactNode } from 'react';
import { useSwipe } from '../lib/useSwipe';

interface Step {
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: ReactNode;
}

const STEPS: Step[] = [
  {
    accent: 'accent',
    eyebrow: 'План от нейросети',
    title: 'Твой план — сразу в дневник',
    body: 'Попроси нейросеть составить программу и вставь ответ. Приложение разложит его по дням: упражнения, подходы, веса. Всё можно поправить руками.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 6l3.2 9.6L37 19l-9.8 3.4L24 32l-3.2-9.6L11 19l9.8-3.4z" />
        <path d="M38 30l1.4 4.2L44 36l-4.6 1.4L38 42l-1.4-4.6L32 36l4.6-1.8z" />
      </svg>
    ),
  },
  {
    accent: 'type-1',
    eyebrow: 'Каждая тренировка',
    title: 'Тренируйся по дневнику',
    body: 'Открываешь день — видишь упражнения, цель и что было в прошлый раз. Вводишь вес и повторы, отмечаешь выполненное. Новый рекорд подсветится сам.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 18v12M15 14v20M33 14v20M38 18v12M15 24h18" />
      </svg>
    ),
  },
  {
    accent: 'type-2',
    eyebrow: 'Инструменты зала',
    title: 'Таймер, блины и техника',
    body: 'Между подходами запускай таймер отдыха. Забыл технику — открой видео одним тапом. Для штанги калькулятор покажет, какие блины навесить.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="27" r="15" />
        <path d="M24 19v8l5 4M19 6h10" />
      </svg>
    ),
  },
  {
    accent: 'type-3',
    eyebrow: 'Прогресс',
    title: 'Виден каждый шаг к цели',
    body: 'В разделе «Обзор» — объем по группам мышц, тепловая карта нагрузки, замеры тела с InBody и путь к твоей цели.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 40V8M8 40h32" />
        <path d="M15 33l7-9 6 4 9-13" />
        <circle cx="39" cy="15" r="2.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const swipeRef = useSwipe<HTMLDivElement>(
    () => setI((x) => Math.min(x + 1, STEPS.length - 1)),
    () => setI((x) => Math.max(x - 1, 0)),
  );

  return (
    <div className="onb-backdrop" role="dialog" aria-modal="true" aria-label="Как пользоваться приложением">
      <div className="onb" ref={swipeRef}>
        <div className="onb-head">
          <span className="onb-brand">Дневник зала</span>
          <button className="onb-skip" onClick={onDone}>Пропустить</button>
        </div>

        <div className="onb-stage" key={i} style={{ ['--c' as string]: `var(--${step.accent})` }}>
          <div className="onb-icon">
            <div className="onb-glow" />
            {step.icon}
          </div>
          <span className="onb-eyebrow">{step.eyebrow}</span>
          <h2 className="onb-title">{step.title}</h2>
          <p className="onb-body">{step.body}</p>
        </div>

        <div className="onb-foot">
          <div className="onb-dots">
            {STEPS.map((_, k) => (
              <button
                key={k}
                className={`onb-dot${k === i ? ' on' : ''}`}
                style={k === i ? { ['--c' as string]: `var(--${step.accent})` } : undefined}
                onClick={() => setI(k)}
                aria-label={`Шаг ${k + 1}`}
              />
            ))}
          </div>
          <button className="onb-next" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? 'Начать' : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  );
}
