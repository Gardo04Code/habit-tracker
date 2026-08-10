-- Enums
create type habit_status as enum ('pending', 'completed', 'partial', 'not_completed', 'not_applicable');
create type habit_lifecycle_status as enum ('active', 'paused', 'archived', 'deleted');
create type goal_type as enum ('boolean', 'quantity', 'duration', 'repetitions', 'deadline', 'accumulated_days');
create type frequency_type as enum ('daily', 'specific_days', 'times_per_week', 'times_per_month', 'one_time', 'custom_interval');
create type goal_status as enum ('active', 'completed', 'expired');
create type time_format as enum ('12h', '24h');

-- Helper: keep updated_at fresh
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles (1:1 con auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  timezone text not null default 'America/Mexico_City',
  week_starts_on smallint not null default 1 check (week_starts_on in (0, 1)),
  time_format time_format not null default '12h',
  language text not null default 'es',
  notify_streak_at_risk boolean not null default true,
  notify_abandoned_habit boolean not null default true,
  notify_weekly_summary boolean not null default true,
  notify_reminders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el profile automáticamente cuando se registra un usuario nuevo
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  icon text not null,
  created_at timestamptz not null default now()
);
create index categories_user_id_idx on public.categories(user_id);

-- habits
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text not null,
  color text not null,
  frequency_type frequency_type not null,
  days_of_week smallint[],
  frequency_target smallint,
  interval_days smallint,
  goal_type goal_type not null,
  target_value numeric,
  target_unit text,
  deadline_time time,
  start_date date not null,
  end_date date,
  lifecycle_status habit_lifecycle_status not null default 'active',
  allow_partial boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index habits_user_id_idx on public.habits(user_id);

create trigger set_habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

-- habit_categories (relación muchos a muchos)
create table public.habit_categories (
  habit_id uuid not null references public.habits(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (habit_id, category_id)
);

-- habit_logs
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  status habit_status not null default 'pending',
  value numeric,
  note text,
  recorded_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date)
);
create index habit_logs_habit_id_idx on public.habit_logs(habit_id);
create index habit_logs_date_idx on public.habit_logs(date);

create trigger set_habit_logs_updated_at
  before update on public.habit_logs
  for each row execute function public.set_updated_at();

-- goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  habit_id uuid references public.habits(id) on delete cascade,
  target_value numeric not null,
  current_value numeric not null default 0,
  unit text not null,
  start_date date not null,
  end_date date not null,
  status goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user_id_idx on public.goals(user_id);
create index goals_habit_id_idx on public.goals(habit_id);

create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.habits enable row level security;
alter table public.habit_categories enable row level security;
alter table public.habit_logs enable row level security;
alter table public.goals enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Categories are manageable by owner" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Habits are manageable by owner" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Habit categories manageable by owner" on public.habit_categories
  for all
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));

create policy "Habit logs manageable by owner" on public.habit_logs
  for all
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));

create policy "Goals are manageable by owner" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
