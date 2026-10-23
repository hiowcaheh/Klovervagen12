-- Home installation planner (static site on GitHub Pages).
--
-- Access is limited to the e-mail addresses listed in planner_allowed_emails.
-- The rows of that table and the house floor plan in planner_config are private
-- data: they are inserted directly in the database and never committed here.

-- Allow-list ------------------------------------------------------------------

create table public.planner_allowed_emails (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.planner_allowed_emails is
  'E-mail addresses allowed to use the planner. Optional user_id pins the entry to one account.';

alter table public.planner_allowed_emails enable row level security;

revoke all on table public.planner_allowed_emails from anon;
revoke insert, update, delete, truncate on table public.planner_allowed_emails from authenticated;
grant select on table public.planner_allowed_emails to authenticated;

create policy "Members read their own entry"
  on public.planner_allowed_emails
  for select
  to authenticated
  using (
    email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    and (user_id is null or user_id = (select auth.uid()))
  );

create function public.planner_is_member()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.planner_allowed_emails a
    where a.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      and (a.user_id is null or a.user_id = (select auth.uid()))
  );
$$;

revoke execute on function public.planner_is_member() from public, anon;
grant execute on function public.planner_is_member() to authenticated;

-- Points placed on the floor plan ---------------------------------------------

create table public.planner_points (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type ~ '^[a-z]{1,20}$'),
  floor text not null check (floor ~ '^[a-z0-9_-]{1,20}$'),
  x double precision not null check (x between -50 and 50),
  y double precision not null check (y between -50 and 50),
  code text not null check (code ~ '^[A-Z]{1,3}[0-9]{1,3}$'),
  note text not null default '' check (char_length(note) <= 300),
  qty integer not null default 1 check (qty between 1 and 999),
  len numeric(6, 2) not null default 0 check (len between 0 and 200),
  grp text not null default '' check (char_length(grp) <= 40),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index planner_points_created_by_idx on public.planner_points (created_by);

create function public.planner_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger planner_points_touch_updated_at
  before update on public.planner_points
  for each row execute function public.planner_touch_updated_at();

alter table public.planner_points enable row level security;

revoke all on table public.planner_points from anon;
grant select, insert, update, delete on table public.planner_points to authenticated;

create policy "Members read points"
  on public.planner_points for select to authenticated
  using ((select public.planner_is_member()));

create policy "Members add points"
  on public.planner_points for insert to authenticated
  with check ((select public.planner_is_member()));

create policy "Members change points"
  on public.planner_points for update to authenticated
  using ((select public.planner_is_member()))
  with check ((select public.planner_is_member()));

create policy "Members remove points"
  on public.planner_points for delete to authenticated
  using ((select public.planner_is_member()));

-- Private configuration (floor plan geometry, suggestions) -------------------

create table public.planner_config (
  key text primary key check (key ~ '^[a-z_]{1,40}$'),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_config enable row level security;

revoke all on table public.planner_config from anon;
revoke insert, update, delete, truncate on table public.planner_config from authenticated;
grant select on table public.planner_config to authenticated;

create policy "Members read config"
  on public.planner_config for select to authenticated
  using ((select public.planner_is_member()));
