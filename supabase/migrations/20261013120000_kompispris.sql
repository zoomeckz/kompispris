-- KompisPris database: accounts, roles, recipes, shopping lists, settings, usage stats,
-- scrape runs and the public price library bucket.

-- ---------- clean out the previous project (Melody Maestro) ----------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;
drop function if exists public.has_role(uuid, public.app_role) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_updated_at_column() cascade;
drop type if exists public.app_role cascade;

-- ---------- roles ----------
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- security definer so policies can check roles without recursion
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  provider text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- The owner's email becomes admin automatically on sign-up. No password is stored anywhere in the app.
create table public.admin_emails (email text primary key);
alter table public.admin_emails enable row level security;
insert into public.admin_emails (email) values ('sam.nowroozi@gmail.com');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, provider)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          coalesce(new.raw_app_meta_data->>'provider', 'email'))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  if exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email)) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- if the admin already has an account when this runs
insert into public.profiles (id, email, display_name, provider)
  select u.id, u.email, split_part(u.email, '@', 1), coalesce(u.raw_app_meta_data->>'provider', 'email') from auth.users u
  on conflict (id) do nothing;
insert into public.user_roles (user_id, role) select u.id, 'user' from auth.users u on conflict do nothing;
insert into public.user_roles (user_id, role)
  select u.id, 'admin' from auth.users u join public.admin_emails a on lower(a.email) = lower(u.email)
  on conflict do nothing;

create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen = now() where id = auth.uid()
$$;

-- ---------- recipes, lists, settings ----------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null default 'Nytt recept',
  portions int not null default 4,
  notes text not null default '',
  ings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null default 'Matlista',
  mode text not null default 'cheap',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.recipes enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.user_settings enable row level security;
create policy "own recipes" on public.recipes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own lists" on public.shopping_lists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own settings" on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index on public.recipes (user_id);
create index on public.shopping_lists (user_id);

-- ---------- usage events (searches and added ingredients) ----------
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  kind text not null check (kind in ('search', 'add')),
  term text not null check (char_length(term) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table public.usage_events enable row level security;
-- anyone using the app may log a search; signed-in users are linked to their id
create policy "log own events" on public.usage_events for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
create policy "admins read events" on public.usage_events for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create index on public.usage_events (kind, created_at);

-- ---------- scrape runs ----------
create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  triggered_by uuid references auth.users(id) on delete set null,
  source text not null default 'manual',
  summary text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
alter table public.scrape_runs enable row level security;
create policy "admins read runs" on public.scrape_runs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---------- admin statistics (admins only) ----------
create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not allowed'; end if;
  return json_build_object(
    'users', (select count(*) from profiles),
    'active_7d', (select count(*) from profiles where last_seen > now() - interval '7 days'),
    'new_7d', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'recipes', (select count(*) from recipes),
    'lists', (select count(*) from shopping_lists),
    'searches', (select count(*) from usage_events where kind = 'search'),
    'searches_7d', (select count(*) from usage_events where kind = 'search' and created_at > now() - interval '7 days')
  );
end $$;

create or replace function public.admin_signups(days int default 30)
returns table (day date, n bigint) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not allowed'; end if;
  return query
    select d::date, (select count(*) from profiles p where p.created_at::date = d::date)
    from generate_series(current_date - (days - 1), current_date, interval '1 day') d order by 1;
end $$;

create or replace function public.admin_top_terms(_kind text default 'search', days int default 30, lim int default 20)
returns table (term text, n bigint) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not allowed'; end if;
  return query
    select lower(e.term), count(*) from usage_events e
    where e.kind = _kind and e.created_at > now() - make_interval(days => days)
    group by 1 order by 2 desc limit lim;
end $$;

create or replace function public.admin_users()
returns table (id uuid, email text, display_name text, provider text, created_at timestamptz, last_seen timestamptz,
               is_admin boolean, recipes bigint, lists bigint, searches bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not allowed'; end if;
  return query
    select p.id, p.email, p.display_name, p.provider, p.created_at, p.last_seen,
           public.has_role(p.id, 'admin'),
           (select count(*) from recipes r where r.user_id = p.id),
           (select count(*) from shopping_lists l where l.user_id = p.id),
           (select count(*) from usage_events e where e.user_id = p.id and e.kind = 'search')
    from profiles p order by p.last_seen desc;
end $$;

-- ---------- price library bucket (public read, written only by the scraper with the service key) ----------
insert into storage.buckets (id, name, public) values ('library', 'library', true) on conflict (id) do nothing;
drop policy if exists "public read library" on storage.objects;
create policy "public read library" on storage.objects for select using (bucket_id = 'library');
