export interface PlateResult {
  perSide: number[]; // блины на одну сторону, по убыванию номинала
  achievable: number; // реально достижимый вес с этим инвентарем
  exact: boolean; // точно ли совпало с целью
}

const EPS = 1e-9;

/**
 * Раскладка блинов на одну сторону штанги под целевой вес.
 * Жадный алгоритм: берем максимально крупные доступные блины (запас не ограничен).
 * Если точно не собирается — возвращаем ближайший снизу достижимый вес.
 */
export function computePlates(target: number, barWeight: number, available: number[]): PlateResult {
  if (!Number.isFinite(target) || target <= barWeight) {
    return { perSide: [], achievable: barWeight, exact: Math.abs(target - barWeight) < EPS };
  }

  const perSideTarget = (target - barWeight) / 2;
  const sorted = [...available].filter((p) => p > 0).sort((a, b) => b - a);
  const perSide: number[] = [];
  let remaining = perSideTarget;

  for (const plate of sorted) {
    while (remaining >= plate - EPS) {
      perSide.push(plate);
      remaining -= plate;
    }
  }

  const loaded = perSide.reduce((sum, p) => sum + p, 0);
  const achievable = barWeight + loaded * 2;
  return { perSide, achievable, exact: Math.abs(achievable - target) < 1e-6 };
}

/** Сводка блинов с повторами: [25,25,10] → "25 × 2, 10". */
export function summarizePlates(perSide: number[]): string {
  if (perSide.length === 0) return '—';
  const counts = new Map<number, number>();
  for (const p of perSide) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()]
    .map(([w, n]) => (n > 1 ? `${w} × ${n}` : `${w}`))
    .join(', ');
}
