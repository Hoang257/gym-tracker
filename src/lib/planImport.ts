import { z } from 'zod';
import type { Exercise, ExerciseCatalog, Program, ProgramDay, AccentKey } from './types';
import { uuid } from './storage';

// Группы мышц, которые понимает приложение (совпадают с MuscleGroup).
export const MUSCLE_GROUPS = [
  'chest', 'back_lats', 'back_mid', 'delts_side', 'delts_rear', 'delts_front',
  'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'forearms',
] as const;

const muscleTagSchema = z.object({
  group: z.enum(MUSCLE_GROUPS),
  role: z.enum(['primary', 'secondary']).default('primary'),
});

const exerciseSchema = z.object({
  name: z.string().min(1, 'у упражнения пустое название'),
  sets: z.number().int().min(1).max(20),
  low: z.number().min(1).max(600),
  high: z.number().min(1).max(600),
  unit: z.enum(['kg', 'bw', 'sec']).default('kg'),
  inc: z.number().min(0).max(50).default(2.5),
  rest: z.number().int().min(0).max(900).optional(),
  hint: z.string().optional(),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']).optional(),
  muscles: z.array(muscleTagSchema).default([]),
});

const daySchema = z.object({
  title: z.string().min(1, 'у дня пустое название'),
  subtitle: z.string().optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  time: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, 'в дне нет упражнений'),
});

export const planSchema = z.object({
  name: z.string().min(1).default('Моя программа'),
  goal: z.string().optional(),
  days: z.array(daySchema).min(1, 'в плане нет дней'),
});

export type PlanInput = z.infer<typeof planSchema>;

const ACCENTS: AccentKey[] = ['type-1', 'type-3', 'type-2'];

// Транслитерация для стабильных id упражнений: одно и то же название всегда
// даст один и тот же id, поэтому история и прогресс не разрываются при переимпорте.
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e',
  ю: 'yu', я: 'ya',
};

export function slugify(name: string): string {
  const lower = name.toLowerCase().replace(/ё/g, 'е');
  let out = '';
  for (const ch of lower) {
    if (TRANSLIT[ch] !== undefined) out += TRANSLIT[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '-';
  }
  const slug = out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return slug || 'ex';
}

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' техника')}`;

export interface ImportResult {
  program: Program;
  exercises: ExerciseCatalog;
}

export interface ParseOutcome {
  ok: boolean;
  result?: ImportResult;
  errors: string[];
}

/**
 * Разбирает JSON плана от нейросети в программу приложения.
 * Никогда не бросает: любые проблемы возвращаются списком понятных сообщений.
 */
export function parsePlan(raw: string, userId: string, existing?: ExerciseCatalog): ParseOutcome {
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch {
    return { ok: false, errors: ['Это не похоже на JSON. Скопируйте ответ нейросети целиком, без пояснений.'] };
  }

  const parsed = planSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.slice(0, 8).map((i) => {
      const path = i.path.length ? `${i.path.join(' → ')}: ` : '';
      return `${path}${i.message}`;
    });
    return { ok: false, errors };
  }

  const plan = parsed.data;
  const catalog: ExerciseCatalog = {};
  const usedDayIds = new Set<string>();

  const days: ProgramDay[] = plan.days.map((d, dayIdx) => {
    // id дня уникален внутри программы, даже если названия совпадают
    let dayId = slugify(d.title);
    while (usedDayIds.has(dayId)) dayId = `${dayId}-${dayIdx}`;
    usedDayIds.add(dayId);

    const slots = d.exercises.map((e, i) => {
      const exId = slugify(e.name);
      // Сохраняем данные каталога: имеющееся упражнение не перетираем видео-ссылкой
      const prev = existing?.[exId];
      const ex: Exercise = {
        id: exId,
        name: e.name,
        unit: e.unit,
        muscles: e.muscles.length ? e.muscles : (prev?.muscles ?? []),
        equipment: e.equipment ?? prev?.equipment,
        videoUrl: prev?.videoUrl ?? yt(e.name),
        defaultRest: e.rest ?? prev?.defaultRest,
      };
      catalog[exId] = ex;

      // low/high могли прийти перепутанными — нормализуем
      const low = Math.min(e.low, e.high);
      const high = Math.max(e.low, e.high);

      return {
        exerciseId: exId,
        sets: e.sets,
        low,
        high,
        inc: e.inc,
        hint: e.hint,
        rest: e.rest,
        order: i,
      };
    });

    return {
      id: dayId,
      title: d.title,
      subtitle: d.subtitle,
      accent: ACCENTS[dayIdx % ACCENTS.length],
      schedule: d.weekday === undefined ? undefined : { weekday: d.weekday, time: d.time },
      slots,
    };
  });

  const program: Program = {
    id: uuid(),
    userId,
    updatedAt: Date.now(),
    rev: 1,
    name: plan.name,
    goal: plan.goal,
    days,
  };

  return { ok: true, result: { program, exercises: catalog }, errors: [] };
}

/** Нейросети любят оборачивать ответ в ```json ... ``` — снимаем обертку. */
function stripFences(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith('```')) return t;
  return t.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
}

/** Промпт для нейросети: пользователь копирует его вместе со своей целью. */
export const PROMPT_TEMPLATE = `Составь мне программу тренировок и верни ТОЛЬКО валидный JSON без пояснений, markdown и текста вокруг.

Мои данные и цель: [ОПИШИ ЗДЕСЬ: пол, возраст, вес, рост, стаж, сколько дней в неделю, цель, доступное оборудование, ограничения по здоровью]

Формат ответа строго такой:
{
  "name": "Название программы",
  "goal": "Цель одной строкой",
  "days": [
    {
      "title": "Название дня",
      "subtitle": "Какие мышцы работают",
      "weekday": 2,
      "time": "19:00",
      "exercises": [
        {
          "name": "Название упражнения",
          "sets": 4,
          "low": 6,
          "high": 10,
          "unit": "kg",
          "inc": 2.5,
          "rest": 150,
          "hint": "Короткая подсказка по технике",
          "equipment": "dumbbell",
          "muscles": [
            { "group": "chest", "role": "primary" },
            { "group": "triceps", "role": "secondary" }
          ]
        }
      ]
    }
  ]
}

Правила:
- weekday: 0=воскресенье, 1=понедельник, ... 6=суббота.
- unit: "kg" (вес в кг), "bw" (свой вес, доп. вес на пояс) или "sec" (время в секундах, тогда low/high — это секунды).
- inc — на сколько кг повышать вес, когда все подходы сделаны на верхнюю границу.
- rest — отдых между подходами в секундах.
- muscles.group строго из списка: chest, back_lats, back_mid, delts_side, delts_rear, delts_front, biceps, triceps, quads, hamstrings, glutes, calves, abs, forearms.
- role: "primary" для целевой мышцы, "secondary" для ассистентов. Указывай мышцы обязательно — по ним считается недельный объем.
- Названия упражнений и подсказки — на русском.`;
