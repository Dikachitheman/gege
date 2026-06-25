-- =============================================================================
-- RSU Hostel Allocation System — Schema (3NF)
-- Run order: 0001_schema.sql -> 0002_rls.sql -> 0003_seed.sql
-- Safe to re-run: drops and recreates everything in the public app surface.
-- =============================================================================

-- ----- Extensions -----------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----- Clean slate (idempotent) ---------------------------------------------
drop view  if exists public.room_availability      cascade;
drop view  if exists public.hostel_availability    cascade;

drop table if exists public.audit_logs             cascade;
drop table if exists public.notifications          cascade;
drop table if exists public.complaints             cascade;
drop table if exists public.payment_installments   cascade;
drop table if exists public.payments               cascade;
drop table if exists public.allocations            cascade;
drop table if exists public.applications           cascade;
drop table if exists public.bed_spaces             cascade;
drop table if exists public.rooms                  cascade;
drop table if exists public.wings                  cascade;
drop table if exists public.floors                 cascade;
drop table if exists public.hostels                cascade;
drop table if exists public.academic_sessions      cascade;
drop table if exists public.settings               cascade;
drop table if exists public.profiles               cascade;

drop type if exists public.user_role          cascade;
drop type if exists public.gender_type        cascade;
drop type if exists public.room_status        cascade;
drop type if exists public.bed_status         cascade;
drop type if exists public.application_status cascade;
drop type if exists public.allocation_status  cascade;
drop type if exists public.payment_status     cascade;
drop type if exists public.payment_plan       cascade;
drop type if exists public.complaint_status   cascade;
drop type if exists public.notification_type  cascade;

-- ----- Enums ----------------------------------------------------------------
create type public.user_role          as enum ('student', 'hostel_admin', 'finance_officer', 'super_admin');
create type public.gender_type        as enum ('male', 'female');
create type public.room_status        as enum ('available', 'reserved', 'occupied', 'maintenance');
create type public.bed_status         as enum ('available', 'reserved', 'occupied');
create type public.application_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.allocation_status  as enum ('active', 'released');
create type public.payment_status     as enum ('pending', 'partial', 'completed', 'failed');
create type public.payment_plan       as enum ('full', 'installment');
create type public.complaint_status   as enum ('open', 'under_review', 'resolved', 'closed');
create type public.notification_type  as enum ('info', 'success', 'warning', 'error');

-- ----- Shared helpers -------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- =============================================================================
-- profiles  (1:1 with auth.users)
-- =============================================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  matric_number text unique,
  email         text not null,
  gender        public.gender_type,
  faculty       text,
  department    text,
  level         text,
  phone         text,
  role          public.user_role not null default 'student',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_role_idx   on public.profiles(role);
create index profiles_gender_idx on public.profiles(gender);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Helper: current user's role (used by RLS, avoids recursion via SECURITY DEFINER)
create or replace function public.current_role_name()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('hostel_admin', 'finance_officer', 'super_admin')
  );
$$;

-- Create a profile automatically whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, matric_number, gender, faculty, department, level, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'matric_number', ''),
    (nullif(new.raw_user_meta_data ->> 'gender', ''))::public.gender_type,
    nullif(new.raw_user_meta_data ->> 'faculty', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    nullif(new.raw_user_meta_data ->> 'level', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce((nullif(new.raw_user_meta_data ->> 'role', ''))::public.user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- academic_sessions
-- =============================================================================
create table public.academic_sessions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,           -- e.g. "2024/2025"
  is_active  boolean not null default false,
  starts_on  date,
  ends_on    date,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- settings  (key/value app config)
-- =============================================================================
create table public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- hostels
-- =============================================================================
create table public.hostels (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  code         text not null unique,
  gender       public.gender_type not null,
  description  text,
  fee          integer not null default 50000,    -- NGN
  amenities    text[] not null default '{}',
  image_url    text,
  created_at   timestamptz not null default now()
);
create index hostels_gender_idx on public.hostels(gender);

-- =============================================================================
-- floors  ->  wings  ->  rooms  ->  bed_spaces
-- =============================================================================
create table public.floors (
  id         uuid primary key default gen_random_uuid(),
  hostel_id  uuid not null references public.hostels(id) on delete cascade,
  number     integer not null,
  label      text not null,
  created_at timestamptz not null default now(),
  unique (hostel_id, number)
);
create index floors_hostel_idx on public.floors(hostel_id);

create table public.wings (
  id         uuid primary key default gen_random_uuid(),
  hostel_id  uuid not null references public.hostels(id) on delete cascade,
  floor_id   uuid not null references public.floors(id) on delete cascade,
  letter     char(1) not null,
  label      text not null,
  created_at timestamptz not null default now(),
  unique (floor_id, letter)
);
create index wings_hostel_idx on public.wings(hostel_id);
create index wings_floor_idx  on public.wings(floor_id);

create table public.rooms (
  id           uuid primary key default gen_random_uuid(),
  hostel_id    uuid not null references public.hostels(id) on delete cascade,
  floor_id     uuid not null references public.floors(id) on delete cascade,
  wing_id      uuid not null references public.wings(id)  on delete cascade,
  room_number  text not null,
  capacity     integer not null default 4,
  status       public.room_status not null default 'available',
  created_at   timestamptz not null default now(),
  unique (hostel_id, room_number)
);
create index rooms_hostel_idx on public.rooms(hostel_id);
create index rooms_wing_idx   on public.rooms(wing_id);
create index rooms_floor_idx  on public.rooms(floor_id);

create table public.bed_spaces (
  id           uuid primary key default gen_random_uuid(),
  hostel_id    uuid not null references public.hostels(id) on delete cascade,
  room_id      uuid not null references public.rooms(id) on delete cascade,
  bed_number   integer not null,
  position     text not null,                 -- e.g. "Bunk 1 - Bottom"
  status       public.bed_status not null default 'available',
  occupant_id  uuid references public.profiles(id) on delete set null,
  reserved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (room_id, bed_number)
);
create index bed_spaces_room_idx     on public.bed_spaces(room_id);
create index bed_spaces_hostel_idx   on public.bed_spaces(hostel_id);
create index bed_spaces_occupant_idx on public.bed_spaces(occupant_id);
-- A student can hold at most ONE bed at a time:
create unique index bed_spaces_one_per_student
  on public.bed_spaces(occupant_id)
  where occupant_id is not null;

-- =============================================================================
-- applications
-- =============================================================================
create table public.applications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  hostel_id    uuid not null references public.hostels(id),
  room_id      uuid not null references public.rooms(id),
  bed_id       uuid not null references public.bed_spaces(id),
  session_id   uuid references public.academic_sessions(id),
  status       public.application_status not null default 'pending',
  notes        text,
  reviewed_by  uuid references public.profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index applications_profile_idx on public.applications(profile_id);
create index applications_status_idx  on public.applications(status);
-- One open application per student per session:
create unique index applications_one_open_per_student
  on public.applications(profile_id, session_id)
  where status in ('pending', 'approved');

create trigger trg_applications_updated
  before update on public.applications
  for each row execute function public.set_updated_at();

-- =============================================================================
-- allocations
-- =============================================================================
create table public.allocations (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  hostel_id      uuid not null references public.hostels(id),
  room_id        uuid not null references public.rooms(id),
  bed_id         uuid not null references public.bed_spaces(id),
  session_id     uuid references public.academic_sessions(id),
  letter_ref     text not null unique,
  qr_payload     text not null,
  status         public.allocation_status not null default 'active',
  allocated_at   timestamptz not null default now()
);
create index allocations_profile_idx on public.allocations(profile_id);
create unique index allocations_one_active_per_student
  on public.allocations(profile_id, session_id)
  where status = 'active';

-- =============================================================================
-- payments  +  installments
-- =============================================================================
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  amount_due     integer not null,
  amount_paid    integer not null default 0,
  plan           public.payment_plan not null default 'full',
  method         text not null default 'paystack',
  reference      text not null unique,
  transaction_id text,
  status         public.payment_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index payments_profile_idx on public.payments(profile_id);

create trigger trg_payments_updated
  before update on public.payments
  for each row execute function public.set_updated_at();

create table public.payment_installments (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null references public.payments(id) on delete cascade,
  sequence    integer not null,
  amount      integer not null,
  reference   text not null,
  paid_at     timestamptz not null default now()
);
create index payment_installments_payment_idx on public.payment_installments(payment_id);

-- =============================================================================
-- complaints
-- =============================================================================
create table public.complaints (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  subject      text not null,
  category     text not null default 'general',
  description  text not null,
  evidence_url text,
  status       public.complaint_status not null default 'open',
  assigned_to  uuid references public.profiles(id),
  response     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index complaints_profile_idx on public.complaints(profile_id);
create index complaints_status_idx  on public.complaints(status);

create trigger trg_complaints_updated
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- =============================================================================
-- notifications
-- =============================================================================
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  type       public.notification_type not null default 'info',
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications(profile_id, is_read);

-- =============================================================================
-- audit_logs
-- =============================================================================
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  uuid,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on public.audit_logs(actor_id);

-- =============================================================================
-- Availability views (respect RLS via security_invoker)
-- =============================================================================
create view public.hostel_availability
with (security_invoker = on) as
select
  h.id as hostel_id,
  count(b.*)                                          as total_beds,
  count(b.*) filter (where b.status = 'available')    as available_beds,
  count(b.*) filter (where b.status = 'reserved')     as reserved_beds,
  count(b.*) filter (where b.status = 'occupied')     as occupied_beds,
  count(distinct r.id)                                as total_rooms
from public.hostels h
left join public.rooms r      on r.hostel_id = h.id
left join public.bed_spaces b on b.hostel_id = h.id
group by h.id;

create view public.room_availability
with (security_invoker = on) as
select
  r.id as room_id,
  r.capacity,
  count(b.*) filter (where b.status = 'available') as available_beds,
  count(b.*) filter (where b.status = 'occupied')  as occupied_beds,
  count(b.*) filter (where b.status = 'reserved')  as reserved_beds
from public.rooms r
left join public.bed_spaces b on b.room_id = r.id
group by r.id;

-- =============================================================================
-- RPC: reserve a bed atomically (prevents double-booking)
-- =============================================================================
create or replace function public.reserve_bed(p_bed_id uuid)
returns public.bed_spaces
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bed public.bed_spaces;
begin
  if v_uid is null then
    raise exception 'You must be signed in to reserve a bed.';
  end if;

  -- Release any bed this student is currently holding but has not been allocated.
  update public.bed_spaces
     set status = 'available', occupant_id = null, reserved_at = null
   where occupant_id = v_uid and status = 'reserved';

  -- Lock the target row to serialise concurrent reservations.
  select * into v_bed from public.bed_spaces where id = p_bed_id for update;

  if v_bed.id is null then
    raise exception 'That bed space no longer exists.';
  end if;
  if v_bed.status <> 'available' then
    raise exception 'Sorry, that bed space has just been taken. Please pick another.';
  end if;

  update public.bed_spaces
     set status = 'reserved', occupant_id = v_uid, reserved_at = now()
   where id = p_bed_id
   returning * into v_bed;

  return v_bed;
end; $$;

-- =============================================================================
-- RPC: release the caller's currently reserved bed
-- =============================================================================
create or replace function public.release_my_bed()
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.bed_spaces
     set status = 'available', occupant_id = null, reserved_at = null
   where occupant_id = auth.uid() and status = 'reserved';
end; $$;

-- =============================================================================
-- RPC: approve an application -> confirm bed + create allocation + notify
-- =============================================================================
create or replace function public.approve_application(p_application_id uuid)
returns public.allocations
language plpgsql security definer set search_path = public as $$
declare
  v_app public.applications;
  v_alloc public.allocations;
  v_ref text;
begin
  if not public.is_staff() then
    raise exception 'Only staff can approve applications.';
  end if;

  select * into v_app from public.applications where id = p_application_id for update;
  if v_app.id is null then
    raise exception 'Application not found.';
  end if;

  v_ref := 'RSU/' || to_char(now(), 'YYYY') || '/' ||
           upper(substr(replace(p_application_id::text, '-', ''), 1, 6));

  update public.applications
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_application_id;

  update public.bed_spaces
     set status = 'occupied', occupant_id = v_app.profile_id
   where id = v_app.bed_id;

  update public.rooms r
     set status = case
       when (select count(*) from public.bed_spaces b
              where b.room_id = r.id and b.status = 'available') = 0
       then 'occupied' else 'available' end
   where r.id = v_app.room_id;

  insert into public.allocations
    (application_id, profile_id, hostel_id, room_id, bed_id, session_id, letter_ref, qr_payload)
  values
    (v_app.id, v_app.profile_id, v_app.hostel_id, v_app.room_id, v_app.bed_id, v_app.session_id,
     v_ref, v_ref || '|' || v_app.profile_id::text)
  returning * into v_alloc;

  insert into public.notifications (profile_id, title, body, type, link)
  values (v_app.profile_id, 'Allocation approved 🎉',
          'Your hostel allocation has been approved. Download your allocation letter from the dashboard.',
          'success', '/dashboard/allocation');

  return v_alloc;
end; $$;

-- =============================================================================
-- RPC: finalize_my_allocation
-- Student-callable. Because the admin approval UI is deferred, a successful
-- (simulated) payment lets the student finalize their own allocation. Requires
-- the application to belong to the caller AND its payment to be completed.
-- =============================================================================
create or replace function public.finalize_my_allocation(p_application_id uuid)
returns public.allocations
language plpgsql security definer set search_path = public as $$
declare
  v_app   public.applications;
  v_alloc public.allocations;
  v_paid  boolean;
  v_ref   text;
begin
  select * into v_app from public.applications where id = p_application_id for update;
  if v_app.id is null then
    raise exception 'Application not found.';
  end if;
  if v_app.profile_id <> auth.uid() then
    raise exception 'You can only finalize your own application.';
  end if;

  -- Already finalized? Return the existing allocation (idempotent).
  select * into v_alloc from public.allocations where application_id = p_application_id;
  if v_alloc.id is not null then
    return v_alloc;
  end if;

  select exists (
    select 1 from public.payments
    where application_id = p_application_id
      and profile_id = auth.uid()
      and status = 'completed'
  ) into v_paid;

  if not v_paid then
    raise exception 'Payment must be completed before your allocation can be confirmed.';
  end if;

  v_ref := 'RSU/' || to_char(now(), 'YYYY') || '/' ||
           upper(substr(replace(p_application_id::text, '-', ''), 1, 6));

  update public.applications
     set status = 'approved', reviewed_at = now()
   where id = p_application_id;

  update public.bed_spaces
     set status = 'occupied', occupant_id = v_app.profile_id
   where id = v_app.bed_id;

  update public.rooms r
     set status = case
       when (select count(*) from public.bed_spaces b
              where b.room_id = r.id and b.status = 'available') = 0
       then 'occupied' else 'available' end
   where r.id = v_app.room_id;

  insert into public.allocations
    (application_id, profile_id, hostel_id, room_id, bed_id, session_id, letter_ref, qr_payload)
  values
    (v_app.id, v_app.profile_id, v_app.hostel_id, v_app.room_id, v_app.bed_id, v_app.session_id,
     v_ref, v_ref || '|' || v_app.profile_id::text)
  returning * into v_alloc;

  insert into public.notifications (profile_id, title, body, type, link)
  values (v_app.profile_id, 'Allocation confirmed 🎉',
          'Your bed space has been confirmed. View your allocation details on the dashboard.',
          'success', '/app/allocation');

  return v_alloc;
end; $$;
