-- Схема Supabase для «Дневника зала».
-- Запусти это один раз в Supabase → SQL Editor → New query → Run.
-- Каждая строка — одна сущность (сессия/замер/цель/программа) как JSONB.
-- Доступ ограничен RLS: пользователь видит и меняет только свои строки.

-- ---------- таблицы ----------
create table if not exists gt_sessions (
  user_id    uuid    not null default auth.uid(),
  id         text    not null,
  updated_at bigint  not null,
  deleted    boolean not null default false,
  data       jsonb   not null,
  primary key (user_id, id)
);

create table if not exists gt_body (
  user_id    uuid    not null default auth.uid(),
  id         text    not null,
  updated_at bigint  not null,
  deleted    boolean not null default false,
  data       jsonb   not null,
  primary key (user_id, id)
);

create table if not exists gt_goals (
  user_id    uuid    not null default auth.uid(),
  id         text    not null,
  updated_at bigint  not null,
  deleted    boolean not null default false,
  data       jsonb   not null,
  primary key (user_id, id)
);

-- Активная программа + каталог упражнений одним объектом (единственная строка на пользователя).
create table if not exists gt_program (
  user_id    uuid    not null default auth.uid(),
  updated_at bigint  not null,
  data       jsonb   not null,
  primary key (user_id)
);

-- ---------- RLS: каждый видит только своё ----------
alter table gt_sessions enable row level security;
alter table gt_body     enable row level security;
alter table gt_goals    enable row level security;
alter table gt_program  enable row level security;

drop policy if exists "own rows" on gt_sessions;
drop policy if exists "own rows" on gt_body;
drop policy if exists "own rows" on gt_goals;
drop policy if exists "own rows" on gt_program;

create policy "own rows" on gt_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on gt_body for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on gt_goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on gt_program for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
