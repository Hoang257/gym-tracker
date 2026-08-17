import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseCard } from './ExerciseCard';
import type { ResolvedExercise, SetEntry } from '../lib/types';

const ex = (over: Partial<ResolvedExercise> = {}): ResolvedExercise => ({
  exerciseId: 'incdb',
  name: 'Наклонный жим гантелей',
  unit: 'kg',
  muscles: [],
  sets: 3,
  low: 6,
  high: 10,
  inc: 2,
  hint: 'Наклон 30°',
  ...over,
});

const sets: SetEntry[] = [{ w: '20', r: '10' }];

const noop = {
  onCell: () => {},
  onToggle: () => {},
  onAddSet: () => {},
  onRemoveSet: () => {},
  onStartRest: () => {},
};

describe('ExerciseCard', () => {
  it('показывает название, цель и подсказку', () => {
    render(<ExerciseCard ex={ex()} sets={sets} done={false} lastSets={null} {...noop} />);
    expect(screen.getByText('Наклонный жим гантелей')).toBeInTheDocument();
    expect(screen.getByText('3 × 6–10')).toBeInTheDocument();
    expect(screen.getByText('Наклон 30°')).toBeInTheDocument();
  });

  it('отметка выполнения вызывает onToggle', () => {
    const onToggle = vi.fn();
    render(<ExerciseCard ex={ex()} sets={sets} done={false} lastSets={null} {...noop} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Отметить выполненным'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('ввод в поле веса вызывает onCell', () => {
    const onCell = vi.fn();
    render(<ExerciseCard ex={ex()} sets={sets} done={false} lastSets={null} {...noop} onCell={onCell} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: '25' } });
    expect(onCell).toHaveBeenCalledWith(0, 'w', '25');
  });

  it('PR-бейдж показывается только при isPR', () => {
    const { rerender } = render(<ExerciseCard ex={ex()} sets={sets} done lastSets={null} {...noop} />);
    expect(screen.queryByText('Рекорд')).not.toBeInTheDocument();
    rerender(<ExerciseCard ex={ex()} sets={sets} done isPR lastSets={null} {...noop} />);
    expect(screen.getByText('Рекорд')).toBeInTheDocument();
  });

  it('видео-ссылка рендерится для https и НЕ рендерится для javascript:', () => {
    const { rerender } = render(
      <ExerciseCard ex={ex({ videoUrl: 'https://youtube.com/x' })} sets={sets} done={false} lastSets={null} {...noop} />,
    );
    expect(screen.getByText('▶ техника')).toBeInTheDocument();

    rerender(
      <ExerciseCard ex={ex({ videoUrl: 'javascript:alert(1)' })} sets={sets} done={false} lastSets={null} {...noop} />,
    );
    expect(screen.queryByText('▶ техника')).not.toBeInTheDocument();
  });

  it('кнопка блинов есть только когда передан onOpenCalc', () => {
    const { rerender } = render(<ExerciseCard ex={ex()} sets={sets} done={false} lastSets={null} {...noop} />);
    expect(screen.queryByLabelText('Калькулятор блинов')).not.toBeInTheDocument();
    rerender(<ExerciseCard ex={ex()} sets={sets} done={false} lastSets={null} {...noop} onOpenCalc={() => {}} />);
    expect(screen.getByLabelText('Калькулятор блинов')).toBeInTheDocument();
  });
});
