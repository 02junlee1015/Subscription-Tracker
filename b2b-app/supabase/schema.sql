-- B2B Parts Ordering (Supabase Postgres) schema + RLS
-- Run this in Supabase SQL editor (one-time).

begin;

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.user_role as enum ('admin', 'guest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('draft', 'submitted');
exception when duplicate_object then null; end $$;

-- Core tables
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (brand_id, name)
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  vehicle_model_id uuid not null references public.vehicle_models(id) on delete cascade,
  oe_number text not null,
  part_name text not null,
  category text null,
  remark_default text null,
  created_at timestamptz not null default now(),
  unique (vehicle_model_id, oe_number)
);

-- User profile table (1:1 with auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'guest',
  created_at timestamptz not null default now()
);

-- Exactly one admin: enforced by partial unique index.
create unique index if not exists one_admin_only on public.users (role) where role = 'admin';

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  status public.order_status not null default 'submitted',
  created_at timestamptz not null default now(),
  file_name text null
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  quantity integer not null check (quantity >= 1),
  remark text null
);

-- Automatically create public.users row on signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'guest')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- RLS
alter table public.brands enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.parts enable row level security;
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Helper: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

-- Public catalog read for any logged-in user
drop policy if exists "brands_read" on public.brands;
create policy "brands_read" on public.brands
for select to authenticated
using (true);

drop policy if exists "vehicle_models_read" on public.vehicle_models;
create policy "vehicle_models_read" on public.vehicle_models
for select to authenticated
using (true);

drop policy if exists "parts_read" on public.parts;
create policy "parts_read" on public.parts
for select to authenticated
using (true);

-- Users: can read own profile; admin can read all
drop policy if exists "users_read_own_or_admin" on public.users;
create policy "users_read_own_or_admin" on public.users
for select to authenticated
using (id = auth.uid() or public.is_admin());

-- Orders: owner can insert/select; admin can select all
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Order items: insert/select via order ownership; admin all
drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own" on public.order_items
for insert to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and (o.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin" on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and (o.user_id = auth.uid() or public.is_admin())
  )
);

-- Admin-only write for catalog (optional)
drop policy if exists "brands_admin_write" on public.brands;
create policy "brands_admin_write" on public.brands
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "vehicle_models_admin_write" on public.vehicle_models;
create policy "vehicle_models_admin_write" on public.vehicle_models
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "parts_admin_write" on public.parts;
create policy "parts_admin_write" on public.parts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Seed catalog
insert into public.brands (name, code)
values
  ('Tesla', 'T'),
  ('BMW', 'BM'),
  ('Benz', 'B'),
  ('Audi', 'A')
on conflict (name) do nothing;

-- Example vehicle models (edit freely)
with b as (
  select id, name from public.brands
)
insert into public.vehicle_models (brand_id, name)
select
  b.id,
  v.name
from b
join (values
  ('Tesla', 'Model 3'),
  ('Tesla', 'Model Y'),
  ('Tesla', 'Model X'),
  ('BMW', '3 Series'),
  ('BMW', '5 Series'),
  ('Benz', 'E-Class'),
  ('Benz', 'S-Class'),
  ('Audi', 'A4'),
  ('Audi', 'Q5')
) as v(brand_name, name)
on b.name = v.brand_name
on conflict (brand_id, name) do nothing;

-- Example parts (edit freely)
with m as (
  select vm.id, vm.name as model_name, b.name as brand_name
  from public.vehicle_models vm
  join public.brands b on b.id = vm.brand_id
)
insert into public.parts (vehicle_model_id, oe_number, part_name, category, remark_default)
select
  m.id,
  p.oe_number,
  p.part_name,
  p.category,
  p.remark_default
from m
join (values
  ('Tesla', 'Model 3', 'TES-M3-0001', 'Front Bumper', 'bumper', null),
  ('Tesla', 'Model 3', 'TES-M3-0002', 'Head Lamp (L)', 'head_lamp', null),
  ('Tesla', 'Model 3', 'TES-M3-0003', 'Head Lamp (R)', 'head_lamp', null),
  ('Audi', 'A4', 'AUD-A4-0101', 'Front Bumper', 'bumper', null),
  ('Audi', 'Q5', 'AUD-Q5-0201', 'Mirror Assy', 'mirror', 'Check paint code')
) as p(brand_name, model_name, oe_number, part_name, category, remark_default)
on m.brand_name = p.brand_name and m.model_name = p.model_name
on conflict (vehicle_model_id, oe_number) do nothing;

commit;

-- After you create auth user admin@company.com, promote it:
-- update public.users set role = 'admin' where email = 'admin@company.com';

