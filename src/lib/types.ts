// Единицы измерения упражнения: вес в кг, свой вес (+доп. на пояс), время в секундах.
export type Unit = 'kg' | 'bw' | 'sec';

// Группы мышц для разметки упражнений и подсчета недельного объема.
export type MuscleGroup =
  | 'chest'
  | 'back_lats'
  | 'back_mid'
  | 'delts_side'
  | 'delts_rear'
  | 'delts_front'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'forearms';

export interface MuscleTag {
  group: MuscleGroup;
  // primary = целевая мышца (1.0 подхода), secondary = ассистент (0.5 подхода).
  role: 'primary' | 'secondary';
}

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

// Конверт синхронизации: несут все «владельческие» сущности (Program, Session, BodyMeasurement, Goal).
// Заложен сейчас, чтобы позже добавить облачную синхронизацию без переписывания модели.
export interface SyncMeta {
  id: string; // UUID, генерируется на клиенте (crypto.randomUUID)
  userId: string; // 'local' до входа в аккаунт, затем auth.uid()
  updatedAt: number; // ms локальных часов, ставится при каждой мутации (основа last-write-wins)
  deleted?: boolean; // мягкое удаление (tombstone), чтобы удаление доехало до других устройств
  rev?: number; // счетчик версии записи
}

// ---- Каталог упражнений (что это за упражнение) ----
export interface Exercise {
  id: string;
  name: string;
  unit: Unit;
  muscles: MuscleTag[];
  equipment?: Equipment;
  videoUrl?: string; // ссылка на технику (YouTube)
  defaultRest?: number; // рекомендуемый отдых, сек
}

export type ExerciseCatalog = Record<string, Exercise>;

// ---- Программа как данные (как упражнение запрограммировано в конкретный день) ----
export interface ProgramSlot {
  exerciseId: string;
  sets: number;
  low: number;
  high: number;
  inc: number; // шаг прибавки веса
  hint?: string;
  rest?: number; // переопределяет Exercise.defaultRest
  order: number;
}

export interface DaySchedule {
  weekday: number; // 0=Вс … 6=Сб (JS getDay)
  time?: string; // '21:00'
}

export interface ProgramDay {
  id: string;
  title: string;
  subtitle?: string;
  accent?: AccentKey; // цвет-идентичность дня
  schedule?: DaySchedule;
  slots: ProgramSlot[];
}

export type AccentKey = 'type-1' | 'type-2' | 'type-3';

export interface Program extends SyncMeta {
  name: string;
  goal?: string;
  days: ProgramDay[];
}

// ---- Плоское представление упражнения-в-дне для UI (слот + данные каталога) ----
export interface ResolvedExercise {
  exerciseId: string;
  name: string;
  unit: Unit;
  muscles: MuscleTag[];
  videoUrl?: string;
  sets: number;
  low: number;
  high: number;
  inc: number;
  hint?: string;
  rest?: number;
}

// ---- Сессии (самоописываемые логи, не зависят от текущей программы) ----
export interface SetEntry {
  w: string;
  r: string;
}

export interface LogTarget {
  sets: number;
  low: number;
  high: number;
  inc: number;
}

export interface ExerciseLog {
  exerciseId: string;
  name: string; // снапшот на момент тренировки
  unit: Unit; // снапшот
  muscles?: MuscleTag[]; // снапшот (стабильный объем в истории)
  target?: LogTarget; // снапшот целей (для расчета прогресса задним числом)
  sets: SetEntry[];
  done: boolean;
}

export interface Session extends SyncMeta {
  date: string; // локальная дата YYYY-MM-DD
  ts: number;
  programId: string;
  dayId: string;
  dayTitle: string; // снапшот названия дня
  accent?: AccentKey; // снапшот цвета дня
  logs: ExerciseLog[];
}

// ---- Черновики (незавершенная тренировка, автосохранение; локально, не синхронизируется) ----
export interface Draft {
  done: Record<string, boolean>; // по exerciseId
  sets: Record<string, SetEntry[]>; // по exerciseId
}

export type Drafts = Record<string, Draft>; // ключ: `${date}_${dayId}`

// ---- Замеры тела (InBody) ----
export interface BodyMeasurement extends SyncMeta {
  date: string; // YYYY-MM-DD
  ts: number;
  weight?: number; // кг
  bodyFatPct?: number; // %
  muscleMass?: number; // кг (скелетная мышечная масса)
  bodyWater?: number; // л
  bmi?: number;
  visceralFat?: number;
  note?: string;
  source?: 'manual' | 'inbody_photo';
}

// ---- Цель ----
export type GoalKind = 'bodyweight' | 'bodyfat' | 'musclemass';

export interface Goal extends SyncMeta {
  kind: GoalKind;
  target: number;
  start?: number;
  deadline?: string; // YYYY-MM-DD
}

// ---- Настройки/профиль (локально; часть позже станет синхронизируемой) ----
export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  barWeight: number; // вес грифа, кг
  plates: number[]; // доступные блины на одну сторону, кг
  defaultRest: number; // отдых по умолчанию, сек
  sound: boolean;
  vibrate: boolean;
}

export interface Profile {
  userId: string;
}
