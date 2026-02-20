-- profiles: extends Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  founder_bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- games: core game state
create table games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'won', 'lost')),
  current_year int not null default 1,
  current_quarter int not null default 1,
  cash numeric not null default 10000,
  quality numeric not null default 50,
  engineers int not null default 2,
  sales int not null default 1,
  cumulative_profit numeric not null default 0,
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table games enable row level security;
-- Owner can do anything; anyone can read (spectators)
create policy "Anyone can read games" on games for select using (true);
create policy "Owner can insert games" on games for insert with check (auth.uid() = owner_id);
create policy "Owner can update games" on games for update using (auth.uid() = owner_id);

-- turns: append-only decision/outcome log
create table turns (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  year int not null,
  quarter int not null,
  decisions jsonb not null,
  outcomes jsonb not null,
  created_at timestamptz not null default now()
);

alter table turns enable row level security;
create policy "Anyone can read turns" on turns for select using (true);
create policy "Owner can insert turns" on turns for insert
  with check (
    exists (select 1 from games where games.id = game_id and games.owner_id = auth.uid())
  );

-- participants: human or bot players in a game
create table participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  type text not null check (type in ('human', 'bot')),
  display_name text not null,
  strategy text check (strategy in ('cfo', 'growth', 'quality')),
  created_at timestamptz not null default now()
);

alter table participants enable row level security;
create policy "Anyone can read participants" on participants for select using (true);
create policy "Owner can manage participants" on participants for insert
  with check (
    exists (select 1 from games where games.id = game_id and games.owner_id = auth.uid())
  );

-- external_cache: key-value with SWR timestamps
create table external_cache (
  key text primary key,
  value_json jsonb not null default '{}',
  fetched_at timestamptz not null default now()
);

alter table external_cache enable row level security;
create policy "Anyone can read cache" on external_cache for select using (true);
-- Only service role can write cache (API routes use service key)
