-- ============================================================
-- Unblock Focus — Initial Schema
-- Tables: profiles, habits, sessions
-- All tables have RLS enabled with user-scoped policies
-- ============================================================

-- ====================
-- 1. Profiles table
-- ====================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role inserts via trigger (no insert policy needed for users)
create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ====================
-- 2. Habits table
-- ====================
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  emoji text not null default '🔥',
  color text not null default 'primary',
  daily_goal_minutes integer not null default 30,
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;

create policy "Users can read own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);


-- ====================
-- 3. Sessions table
-- ====================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  intent text not null,
  habit_id uuid references public.habits(id) on delete set null,
  duration_seconds integer not null,
  aborted boolean not null default false,
  session_type text not null default 'focus',
  completed_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Users can read own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);


-- ====================
-- 4. Indexes for performance
-- ====================
create index idx_habits_user_id on public.habits(user_id);
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_sessions_habit_id on public.sessions(habit_id);
create index idx_sessions_completed_at on public.sessions(completed_at);
create index idx_sessions_user_completed on public.sessions(user_id, completed_at);


-- ====================
-- 5. Auto-create profile on signup trigger
-- ====================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ====================
-- 6. Auto-update updated_at on profiles
-- ====================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
