-- Moving Master — full schema: auth/household identity + box/item data.
-- Modeled on the Coaster Tracker project's households/household_members/
-- profiles pattern, extended with a standing per-household join code (a
-- shareable invite code) since multi-member households are a first-class
-- requirement here, not a follow-up.

create extension if not exists "pgcrypto";

-- ── Identity ─────────────────────────────────────────────────────────────

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  owner_user_id uuid references auth.users(id) on delete cascade,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_household_id uuid references households(id) on delete set null
);

create or replace function is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- small helper used by the household_members delete policy below
create or replace function owner_user_id_for(hid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select owner_user_id from households where id = hid;
$$;

alter table households enable row level security;
alter table household_members enable row level security;
alter table profiles enable row level security;

create policy "members can read their household" on households
  for select using (is_household_member(id));
create policy "owner can update their household" on households
  for update using (owner_user_id = auth.uid());
create policy "authenticated users can create a household" on households
  for insert with check (owner_user_id = auth.uid());

create policy "members can read membership rows" on household_members
  for select using (is_household_member(household_id));
create policy "users manage their own membership row" on household_members
  for insert with check (user_id = auth.uid());
create policy "owner can remove a member" on household_members
  for delete using (
    user_id = auth.uid()
    or owner_user_id_for(household_id) = auth.uid()
  );

create policy "users read own profile" on profiles
  for select using (user_id = auth.uid());
create policy "users update own profile" on profiles
  for update using (user_id = auth.uid());
create policy "users insert own profile" on profiles
  for insert with check (user_id = auth.uid());

-- Bootstrap: every new auth user gets an (initially empty) profile row so
-- the client never has to guess whether one exists yet.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Generates a short, human-typeable join code (e.g. "7K4QXN2P").
create or replace function generate_join_code()
returns text
language sql
volatile
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

-- Explicit, client-chosen bootstrap: "create a household" vs "join one" are
-- two distinct actions the signup UI offers, rather than auto-creating a
-- household on every signup and having to reconcile it if the user actually
-- meant to join one via an invite code.
create or replace function create_household(p_name text default 'My Household')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
  new_code text;
begin
  new_code := generate_join_code();
  insert into households (name, owner_user_id, join_code)
    values (p_name, auth.uid(), new_code)
    returning id into new_household_id;
  insert into household_members (household_id, user_id, role)
    values (new_household_id, auth.uid(), 'owner');
  update profiles set default_household_id = new_household_id where user_id = auth.uid();
  return new_household_id;
end;
$$;

-- Runs as security definer so a user can look up a household by join code
-- before they're a member of it (RLS would otherwise hide it from them).
create or replace function redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
begin
  select id into target_household_id from households where join_code = upper(p_code);
  if target_household_id is null then
    raise exception 'Invalid invite code';
  end if;
  insert into household_members (household_id, user_id, role)
    values (target_household_id, auth.uid(), 'member')
    on conflict (household_id, user_id) do nothing;
  update profiles set default_household_id = target_household_id where user_id = auth.uid();
  return target_household_id;
end;
$$;

-- Owner-only: invalidates the old code (anyone who had it can no longer join).
create or replace function regenerate_join_code(p_household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if (select owner_user_id from households where id = p_household_id) != auth.uid() then
    raise exception 'Only the household owner can regenerate the join code';
  end if;
  new_code := generate_join_code();
  update households set join_code = new_code where id = p_household_id;
  return new_code;
end;
$$;

-- ── Inventory data ───────────────────────────────────────────────────────

create table containers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text,
  notes text,
  room text,
  destination_room text,
  box_number int,
  status text not null default 'Packed',
  fragile boolean not null default false,
  heavy boolean not null default false,
  packed_date date,
  exterior_photo_path text,
  contents_photo_path text,
  created_at timestamptz not null default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  container_id uuid not null references containers(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_containers_household on containers(household_id);
create index idx_items_household on items(household_id);
create index idx_items_container on items(container_id);
create index idx_items_name on items using gin (to_tsvector('english', name));

alter table containers enable row level security;
alter table items enable row level security;

create policy "members manage containers" on containers
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy "members manage items" on items
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- Box ID (e.g. "KIT-001") is derived, not stored — same formula shape as
-- the old Airtable formula field, computed in a view so it stays in sync
-- automatically as room/box_number change.
create or replace view containers_with_box_id as
  select
    c.*,
    case
      when c.room is not null and c.box_number is not null
        then upper(left(c.room, 3)) || '-' || lpad(c.box_number::text, 3, '0')
      else null
    end as box_id
  from containers c;

alter view containers_with_box_id set (security_invoker = on);

-- ── Photo storage ────────────────────────────────────────────────────────
-- Private bucket; objects are keyed "{household_id}/{container_id}/{kind}-*"
-- so storage.foldername(name) gives the household id as the first path
-- segment for RLS, mirroring the table-level household scoping above.

insert into storage.buckets (id, name, public)
  values ('photos', 'photos', false)
  on conflict (id) do nothing;

create policy "members can read household photos" on storage.objects
  for select using (
    bucket_id = 'photos' and is_household_member((storage.foldername(name))[1]::uuid)
  );
create policy "members can upload household photos" on storage.objects
  for insert with check (
    bucket_id = 'photos' and is_household_member((storage.foldername(name))[1]::uuid)
  );
create policy "members can replace household photos" on storage.objects
  for update using (
    bucket_id = 'photos' and is_household_member((storage.foldername(name))[1]::uuid)
  );
create policy "members can delete household photos" on storage.objects
  for delete using (
    bucket_id = 'photos' and is_household_member((storage.foldername(name))[1]::uuid)
  );
