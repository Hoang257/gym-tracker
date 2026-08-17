const RU_DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const RU_DOW_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const RU_MONTH = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(iso: string): string {
  const [y, m, day] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  return `${RU_DOW[dt.getDay()]}, ${day} ${RU_MONTH[m - 1]}`;
}

/** Подпись расписания дня: "Вторник · 21:00". */
export function scheduleLabel(weekday: number, time?: string): string {
  const name = RU_DOW_FULL[weekday] ?? '';
  return time ? `${name} · ${time}` : name;
}

export function daysAgo(iso: string, from = new Date()): number {
  const [y, m, day] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a.getTime() - dt.getTime()) / 86400000);
}

/** Начало ISO-недели (понедельник) для даты. */
export function weekStart(d = new Date()): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return s;
}
