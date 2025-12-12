-- Add Access Request workflow (run once in Supabase SQL editor)

begin;

do $$ begin
  create type public.access_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status public.access_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz null,
  decided_by uuid null references public.users(id) on delete set null,
  auth_user_id uuid null references auth.users(id) on delete set null
);

alter table public.access_requests enable row level security;

-- Allow anyone (even anon) to submit a request (server route uses anon key).
drop policy if exists "access_requests_insert_anon" on public.access_requests;
create policy "access_requests_insert_anon" on public.access_requests
for insert to anon
with check (status = 'pending');

-- Admin can view and manage requests
drop policy if exists "access_requests_admin_select" on public.access_requests;
create policy "access_requests_admin_select" on public.access_requests
for select to authenticated
using (public.is_admin());

drop policy if exists "access_requests_admin_update" on public.access_requests;
create policy "access_requests_admin_update" on public.access_requests
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;

