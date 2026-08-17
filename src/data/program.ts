import type {
  ExerciseCatalog,
  Program,
  ProgramDay,
  ProgramSlot,
  ResolvedExercise,
} from '../lib/types';

// Поиск техники упражнения на YouTube (владелец/ИИ позже может заменить на конкретный ролик).
const yt = (q: string) => `https://www.youtube.com/results?search_query=${q.replace(/ /g, '+')}+техника`;

// Каталог: «что это за упражнение» — имя, единицы, мышцы, инвентарь, видео, отдых.
// id совпадают со старой программой (v1), поэтому миграция истории бэкфиллит имена без потерь.
export const EXERCISE_LIBRARY: ExerciseCatalog = {
  // --- Верх · Ширина ---
  incdb: {
    id: 'incdb', name: 'Наклонный жим гантелей', unit: 'kg', equipment: 'dumbbell', defaultRest: 150,
    videoUrl: yt('наклонный жим гантелей'),
    muscles: [{ group: 'chest', role: 'primary' }, { group: 'delts_front', role: 'secondary' }, { group: 'triceps', role: 'secondary' }],
  },
  pullup: {
    id: 'pullup', name: 'Подтягивания', unit: 'bw', equipment: 'bodyweight', defaultRest: 150,
    videoUrl: yt('подтягивания широким хватом'),
    muscles: [{ group: 'back_lats', role: 'primary' }, { group: 'biceps', role: 'secondary' }],
  },
  chestpress: {
    id: 'chestpress', name: 'Жим в тренажере / лежа', unit: 'kg', equipment: 'machine', defaultRest: 120,
    videoUrl: yt('жим от груди в тренажере'),
    muscles: [{ group: 'chest', role: 'primary' }, { group: 'triceps', role: 'secondary' }, { group: 'delts_front', role: 'secondary' }],
  },
  latpull: {
    id: 'latpull', name: 'Тяга верхнего блока', unit: 'kg', equipment: 'cable', defaultRest: 120,
    videoUrl: yt('тяга верхнего блока'),
    muscles: [{ group: 'back_lats', role: 'primary' }, { group: 'biceps', role: 'secondary' }],
  },
  latraise: {
    id: 'latraise', name: 'Разведения в стороны', unit: 'kg', equipment: 'dumbbell', defaultRest: 75,
    videoUrl: yt('махи гантелями в стороны'),
    muscles: [{ group: 'delts_side', role: 'primary' }],
  },
  pushdown: {
    id: 'pushdown', name: 'Разгибание на блоке', unit: 'kg', equipment: 'cable', defaultRest: 75,
    videoUrl: yt('разгибание рук на блоке'),
    muscles: [{ group: 'triceps', role: 'primary' }],
  },
  // --- Ноги ---
  hack: {
    id: 'hack', name: 'Hack Squat', unit: 'kg', equipment: 'machine', defaultRest: 180,
    videoUrl: yt('гакк приседания'),
    muscles: [{ group: 'quads', role: 'primary' }, { group: 'glutes', role: 'secondary' }],
  },
  legpress: {
    id: 'legpress', name: 'Жим ногами', unit: 'kg', equipment: 'machine', defaultRest: 150,
    videoUrl: yt('жим ногами в тренажере'),
    muscles: [{ group: 'quads', role: 'primary' }, { group: 'glutes', role: 'secondary' }, { group: 'hamstrings', role: 'secondary' }],
  },
  legcurl: {
    id: 'legcurl', name: 'Сгибание ног лежа', unit: 'kg', equipment: 'machine', defaultRest: 90,
    videoUrl: yt('сгибание ног лежа'),
    muscles: [{ group: 'hamstrings', role: 'primary' }],
  },
  legext: {
    id: 'legext', name: 'Разгибание ног', unit: 'kg', equipment: 'machine', defaultRest: 75,
    videoUrl: yt('разгибание ног в тренажере'),
    muscles: [{ group: 'quads', role: 'primary' }],
  },
  calf: {
    id: 'calf', name: 'Подъемы на носки', unit: 'kg', equipment: 'machine', defaultRest: 60,
    videoUrl: yt('подъем на носки стоя'),
    muscles: [{ group: 'calves', role: 'primary' }],
  },
  rearfly: {
    id: 'rearfly', name: 'Обратная бабочка', unit: 'kg', equipment: 'machine', defaultRest: 75,
    videoUrl: yt('обратная бабочка задняя дельта'),
    muscles: [{ group: 'delts_rear', role: 'primary' }],
  },
  dbcurl: {
    id: 'dbcurl', name: 'Сгибание с гантелями', unit: 'kg', equipment: 'dumbbell', defaultRest: 75,
    videoUrl: yt('сгибание рук с гантелями'),
    muscles: [{ group: 'biceps', role: 'primary' }],
  },
  // --- Верх · Толщина ---
  chestrow: {
    id: 'chestrow', name: 'Тяга с упором грудью', unit: 'kg', equipment: 'machine', defaultRest: 150,
    videoUrl: yt('тяга с упором в грудь'),
    muscles: [{ group: 'back_mid', role: 'primary' }, { group: 'back_lats', role: 'secondary' }, { group: 'biceps', role: 'secondary' }],
  },
  incmach: {
    id: 'incmach', name: 'Наклонный жим в тренажере', unit: 'kg', equipment: 'machine', defaultRest: 120,
    videoUrl: yt('наклонный жим в тренажере'),
    muscles: [{ group: 'chest', role: 'primary' }, { group: 'delts_front', role: 'secondary' }, { group: 'triceps', role: 'secondary' }],
  },
  hrow: {
    id: 'hrow', name: 'Горизонтальная тяга', unit: 'kg', equipment: 'cable', defaultRest: 120,
    videoUrl: yt('горизонтальная тяга сидя'),
    muscles: [{ group: 'back_mid', role: 'primary' }, { group: 'biceps', role: 'secondary' }],
  },
  crossover: {
    id: 'crossover', name: 'Сведения снизу вверх', unit: 'kg', equipment: 'cable', defaultRest: 75,
    videoUrl: yt('сведение рук в кроссовере снизу вверх'),
    muscles: [{ group: 'chest', role: 'primary' }],
  },
  latraise2: {
    id: 'latraise2', name: 'Разведения в стороны', unit: 'kg', equipment: 'dumbbell', defaultRest: 75,
    videoUrl: yt('махи гантелями в стороны'),
    muscles: [{ group: 'delts_side', role: 'primary' }],
  },
  scott: {
    id: 'scott', name: 'Сгибание на Скотте', unit: 'kg', equipment: 'machine', defaultRest: 75,
    videoUrl: yt('сгибание рук на скамье скотта'),
    muscles: [{ group: 'biceps', role: 'primary' }],
  },
  plank: {
    id: 'plank', name: 'Планка', unit: 'sec', equipment: 'bodyweight', defaultRest: 60,
    videoUrl: yt('планка правильная техника'),
    muscles: [{ group: 'abs', role: 'primary' }],
  },
};

// Хелпер построения слота дня: параметры подходов (веса/диапазоны) живут в дне.
const slot = (
  exerciseId: string, order: number, sets: number, low: number, high: number, inc: number, hint?: string,
): ProgramSlot => ({ exerciseId, order, sets, low, high, inc, hint });

const DAYS: ProgramDay[] = [
  {
    id: 'push',
    title: 'Верх · Ширина',
    subtitle: 'Верх груди, широчайшие сверху, средняя дельта, трицепс',
    accent: 'type-1',
    schedule: { weekday: 2, time: '21:00' },
    slots: [
      slot('incdb', 0, 4, 6, 10, 2, 'Наклон 30°, приоритет. Верх груди'),
      slot('pullup', 1, 4, 6, 10, 2.5, 'Широкий хват. 10 чистых — вешай блин'),
      slot('chestpress', 2, 3, 8, 12, 5, 'Второй стимул на грудь'),
      slot('latpull', 3, 3, 10, 12, 5, 'Локти вниз, корпус вертикально'),
      slot('latraise', 4, 4, 12, 15, 2, 'Без раскачки. Ширина плеч'),
      slot('pushdown', 5, 2, 10, 12, 2.5, 'Трицепс'),
    ],
  },
  {
    id: 'legs',
    title: 'Ноги',
    subtitle: 'Квадрицепс, бицепс бедра, икры, задняя дельта, бицепс',
    accent: 'type-3',
    schedule: { weekday: 4, time: '21:00' },
    slots: [
      slot('hack', 0, 3, 8, 10, 5, 'Первый подход пробный. Глубина важнее веса'),
      slot('legpress', 1, 3, 10, 12, 5, 'Поясница прижата к спинке'),
      slot('legcurl', 2, 3, 10, 15, 5, 'Опускай на два счета'),
      slot('legext', 3, 2, 12, 15, 5, 'Задержка вверху на секунду'),
      slot('calf', 4, 3, 12, 15, 5, 'Пауза внизу в растяжении'),
      slot('rearfly', 5, 3, 12, 15, 2.5, 'Задняя дельта, руки почти прямые'),
      slot('dbcurl', 6, 3, 8, 12, 2, 'Корпус не раскачивается'),
    ],
  },
  {
    id: 'pull',
    title: 'Верх · Толщина',
    subtitle: 'Середина спины, грудь второй раз, средняя дельта, бицепс, пресс',
    accent: 'type-2',
    schedule: { weekday: 6, time: '20:00' },
    slots: [
      slot('chestrow', 0, 4, 8, 12, 5, 'Пауза в конце на секунду. Приоритет'),
      slot('incmach', 1, 3, 8, 12, 5, 'Второй раз верх груди за неделю'),
      slot('hrow', 2, 3, 10, 12, 5, 'Локти вдоль тела, лопатки в конце'),
      slot('crossover', 3, 3, 12, 15, 2.5, 'По диагонали к подбородку. Верх груди'),
      slot('latraise2', 4, 3, 12, 15, 2, 'Средняя дельта, второй раз'),
      slot('scott', 5, 2, 10, 12, 2.5, 'Последние 2–3 повтора тяжелые'),
      slot('plank', 6, 2, 45, 60, 0, 'Поддержание, пресс уже виден'),
    ],
  },
];

// Сид-программа владельца. id стабильный; свежие sync-метаданные проставляет репозиторий при первом сохранении.
export const SEED_PROGRAM: Program = {
  id: 'seed-program',
  userId: 'local',
  updatedAt: 0,
  name: 'Набор массы — 3 дня',
  goal: 'Набор массы 66,4 → 70 кг',
  days: DAYS,
};

// --- Хелперы резолва слота/дня в плоское представление для UI ---
export function resolveSlot(s: ProgramSlot, catalog: ExerciseCatalog = EXERCISE_LIBRARY): ResolvedExercise {
  const ex = catalog[s.exerciseId];
  return {
    exerciseId: s.exerciseId,
    name: ex?.name ?? s.exerciseId,
    unit: ex?.unit ?? 'kg',
    muscles: ex?.muscles ?? [],
    videoUrl: ex?.videoUrl,
    sets: s.sets,
    low: s.low,
    high: s.high,
    inc: s.inc,
    hint: s.hint,
    rest: s.rest ?? ex?.defaultRest,
  };
}

export function resolveDay(day: ProgramDay, catalog: ExerciseCatalog = EXERCISE_LIBRARY): ResolvedExercise[] {
  return [...day.slots].sort((a, b) => a.order - b.order).map((s) => resolveSlot(s, catalog));
}

export function findDay(program: Program, dayId: string): ProgramDay | undefined {
  return program.days.find((d) => d.id === dayId);
}

// Сегодняшний тренировочный день по расписанию (или null в день отдыха).
export function todayDayId(program: Program, d = new Date()): string | null {
  const wd = d.getDay();
  return program.days.find((day) => day.schedule?.weekday === wd)?.id ?? null;
}

// Ближайший следующий тренировочный день (для дней отдыха).
export function nextDayId(program: Program, d = new Date()): string {
  for (let i = 1; i <= 7; i++) {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    const wd = nd.getDay();
    const day = program.days.find((dd) => dd.schedule?.weekday === wd);
    if (day) return day.id;
  }
  return program.days[0]?.id ?? 'push';
}
