import { describe, it, expect } from 'vitest';
import { parsePlan, slugify } from './planImport';

const USER = 'local';

const validPlan = JSON.stringify({
  name: 'Тест-программа',
  goal: 'Набор массы',
  days: [
    {
      title: 'Верх тела',
      subtitle: 'Грудь и спина',
      weekday: 2,
      time: '19:00',
      exercises: [
        {
          name: 'Жим лежа',
          sets: 4, low: 6, high: 10, unit: 'kg', inc: 2.5, rest: 150,
          hint: 'Лопатки сведены',
          equipment: 'barbell',
          muscles: [{ group: 'chest', role: 'primary' }, { group: 'triceps', role: 'secondary' }],
        },
      ],
    },
  ],
});

describe('slugify', () => {
  it('транслитерирует кириллицу стабильно', () => {
    expect(slugify('Жим лежа')).toBe('zhim-lezha');
    expect(slugify('Жим лежа')).toBe(slugify('жим лёжа'));
  });
  it('не выдает пустой id', () => {
    expect(slugify('!!!')).toBe('ex');
  });
});

describe('parsePlan', () => {
  it('разбирает валидный план', () => {
    const r = parsePlan(validPlan, USER);
    expect(r.ok).toBe(true);
    expect(r.result?.program.name).toBe('Тест-программа');
    expect(r.result?.program.days).toHaveLength(1);
    expect(r.result?.program.days[0].slots).toHaveLength(1);
    expect(r.result?.program.userId).toBe(USER);
  });

  it('наполняет каталог упражнений с мышцами', () => {
    const r = parsePlan(validPlan, USER);
    const ex = r.result?.exercises['zhim-lezha'];
    expect(ex?.name).toBe('Жим лежа');
    expect(ex?.muscles.some((m) => m.group === 'chest' && m.role === 'primary')).toBe(true);
    expect(ex?.videoUrl).toContain('youtube.com');
  });

  it('снимает обертку ```json', () => {
    const r = parsePlan('```json\n' + validPlan + '\n```', USER);
    expect(r.ok).toBe(true);
  });

  it('нормализует перепутанные low/high', () => {
    const plan = JSON.parse(validPlan);
    plan.days[0].exercises[0].low = 12;
    plan.days[0].exercises[0].high = 8;
    const r = parsePlan(JSON.stringify(plan), USER);
    expect(r.result?.program.days[0].slots[0].low).toBe(8);
    expect(r.result?.program.days[0].slots[0].high).toBe(12);
  });

  it('дает понятную ошибку на не-JSON', () => {
    const r = parsePlan('Вот ваша программа: делайте жим...', USER);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('JSON');
  });

  it('ловит пустой список дней', () => {
    const r = parsePlan(JSON.stringify({ name: 'X', days: [] }), USER);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('дней');
  });

  it('ловит неизвестную группу мышц', () => {
    const plan = JSON.parse(validPlan);
    plan.days[0].exercises[0].muscles = [{ group: 'wings', role: 'primary' }];
    const r = parsePlan(JSON.stringify(plan), USER);
    expect(r.ok).toBe(false);
  });

  it('разные дни с одинаковым названием получают разные id', () => {
    const plan = JSON.parse(validPlan);
    plan.days.push(JSON.parse(JSON.stringify(plan.days[0])));
    const r = parsePlan(JSON.stringify(plan), USER);
    const ids = r.result?.program.days.map((d) => d.id) ?? [];
    expect(new Set(ids).size).toBe(2);
  });
});
