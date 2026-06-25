-- ==============================================================================
-- RSU Hostel Allocation System — FULL SETUP (run this whole file once)
-- Generated from migrations/0001_schema.sql + 0002_rls.sql + 0003_seed.sql
-- ==============================================================================

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

-- =============================================================================
-- RSU Hostel Allocation System — Row Level Security
-- Demo-friendly but real: students see only their own records; staff see all;
-- catalogue tables (hostels/rooms/beds) are world-readable for browsing.
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.academic_sessions   enable row level security;
alter table public.settings            enable row level security;
alter table public.hostels             enable row level security;
alter table public.floors              enable row level security;
alter table public.wings               enable row level security;
alter table public.rooms               enable row level security;
alter table public.bed_spaces          enable row level security;
alter table public.applications        enable row level security;
alter table public.allocations         enable row level security;
alter table public.payments            enable row level security;
alter table public.payment_installments enable row level security;
alter table public.complaints          enable row level security;
alter table public.notifications       enable row level security;
alter table public.audit_logs          enable row level security;

-- ----- profiles -------------------------------------------------------------
create policy "profiles: read own or staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "profiles: insert self" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles: update own or staff" on public.profiles
  for update using (id = auth.uid() or public.is_staff());

-- ----- catalogue: world-readable, staff-writable ----------------------------
create policy "sessions: read all" on public.academic_sessions for select using (true);
create policy "sessions: staff write" on public.academic_sessions for all
  using (public.is_staff()) with check (public.is_staff());

create policy "settings: read all" on public.settings for select using (true);
create policy "settings: staff write" on public.settings for all
  using (public.is_staff()) with check (public.is_staff());

create policy "hostels: read all" on public.hostels for select using (true);
create policy "hostels: staff write" on public.hostels for all
  using (public.is_staff()) with check (public.is_staff());

create policy "floors: read all" on public.floors for select using (true);
create policy "floors: staff write" on public.floors for all
  using (public.is_staff()) with check (public.is_staff());

create policy "wings: read all" on public.wings for select using (true);
create policy "wings: staff write" on public.wings for all
  using (public.is_staff()) with check (public.is_staff());

create policy "rooms: read all" on public.rooms for select using (true);
create policy "rooms: staff write" on public.rooms for all
  using (public.is_staff()) with check (public.is_staff());

-- Beds are readable by everyone (to render the picker). Writes happen through
-- the SECURITY DEFINER reserve_bed/approve_application RPCs, plus staff manual edits.
create policy "beds: read all" on public.bed_spaces for select using (true);
create policy "beds: staff write" on public.bed_spaces for all
  using (public.is_staff()) with check (public.is_staff());

-- ----- applications ---------------------------------------------------------
create policy "applications: read own or staff" on public.applications
  for select using (profile_id = auth.uid() or public.is_staff());
create policy "applications: insert own" on public.applications
  for insert with check (profile_id = auth.uid());
create policy "applications: update own or staff" on public.applications
  for update using (profile_id = auth.uid() or public.is_staff());

-- ----- allocations (inserted via RPC) ---------------------------------------
create policy "allocations: read own or staff" on public.allocations
  for select using (profile_id = auth.uid() or public.is_staff());
create policy "allocations: staff write" on public.allocations
  for all using (public.is_staff()) with check (public.is_staff());

-- ----- payments -------------------------------------------------------------
create policy "payments: read own or staff" on public.payments
  for select using (profile_id = auth.uid() or public.is_staff());
create policy "payments: insert own" on public.payments
  for insert with check (profile_id = auth.uid());
create policy "payments: update own or staff" on public.payments
  for update using (profile_id = auth.uid() or public.is_staff());

create policy "installments: read own or staff" on public.payment_installments
  for select using (
    public.is_staff() or exists (
      select 1 from public.payments p
      where p.id = payment_id and p.profile_id = auth.uid()
    )
  );
create policy "installments: insert own" on public.payment_installments
  for insert with check (
    exists (select 1 from public.payments p where p.id = payment_id and p.profile_id = auth.uid())
  );

-- ----- complaints -----------------------------------------------------------
create policy "complaints: read own or staff" on public.complaints
  for select using (profile_id = auth.uid() or public.is_staff());
create policy "complaints: insert own" on public.complaints
  for insert with check (profile_id = auth.uid());
create policy "complaints: update own or staff" on public.complaints
  for update using (profile_id = auth.uid() or public.is_staff());

-- ----- notifications --------------------------------------------------------
create policy "notifications: read own or staff" on public.notifications
  for select using (profile_id = auth.uid() or public.is_staff());
create policy "notifications: update own" on public.notifications
  for update using (profile_id = auth.uid());
create policy "notifications: staff/self insert" on public.notifications
  for insert with check (public.is_staff() or profile_id = auth.uid());

-- ----- audit_logs -----------------------------------------------------------
create policy "audit: staff read" on public.audit_logs
  for select using (public.is_staff());
create policy "audit: any insert" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- =============================================================================
-- RSU Hostel Allocation System — Seed data
-- Re-runnable: clears catalogue + allocation data, then regenerates it.
-- (Does NOT touch auth.users / profiles, so your login survives a re-seed.)
-- =============================================================================

-- Wipe transactional + catalogue data (children first).
truncate table
  public.allocations,
  public.applications,
  public.payment_installments,
  public.payments,
  public.bed_spaces,
  public.rooms,
  public.wings,
  public.floors,
  public.hostels
restart identity cascade;

-- ----- Academic session + settings ------------------------------------------
insert into public.academic_sessions (name, is_active, starts_on, ends_on)
values ('2024/2025', true, '2024-09-01', '2025-07-31')
on conflict (name) do update set is_active = excluded.is_active;

insert into public.settings (key, value) values
  ('applications_open', 'true'::jsonb),
  ('installment_minimum_percent', '50'::jsonb),
  ('support_email', '"hostels@rsu.edu.ng"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ----- Hostels --------------------------------------------------------------
-- Female: NDDC Hostel + Hostel A, B, C, D, H   |   Male: Hostel E, F, G
-- Fees: NDDC = 60,000, all others = 50,000
insert into public.hostels (name, code, gender, fee, description, amenities, image_url) values
  ('NDDC Hostel', 'NDDC', 'female', 60000,
   'The flagship NDDC female hostel — the largest on campus with spacious rooms across five floors.',
   array['Laundry Area','Kitchen','Wi-Fi','Study Lounge','Common Room'],
   'https://picsum.photos/seed/rsu-nddc/900/600'),
  ('Hostel A', 'HA', 'female', 50000, 'Female hostel A — close to the faculty of science.',
   array['Laundry Area','Kitchen','Wi-Fi','Study Lounge'], 'https://picsum.photos/seed/rsu-a/900/600'),
  ('Hostel B', 'HB', 'female', 50000, 'Female hostel B — quiet wing ideal for focused study.',
   array['Laundry Area','Kitchen','Wi-Fi','Common Room'], 'https://picsum.photos/seed/rsu-b/900/600'),
  ('Hostel C', 'HC', 'female', 50000, 'Female hostel C — central location near the library.',
   array['Laundry Area','Kitchen','Wi-Fi','Study Lounge'], 'https://picsum.photos/seed/rsu-c/900/600'),
  ('Hostel D', 'HD', 'female', 50000, 'Female hostel D — newly renovated rooms.',
   array['Laundry Area','Kitchen','Wi-Fi','Common Room'], 'https://picsum.photos/seed/rsu-d/900/600'),
  ('Hostel H', 'HH', 'female', 50000, 'Female hostel H — overlooks the sports complex.',
   array['Laundry Area','Kitchen','Wi-Fi','Study Lounge'], 'https://picsum.photos/seed/rsu-h/900/600'),
  ('Hostel E', 'HE', 'male', 50000, 'Male hostel E — close to the engineering faculty.',
   array['Laundry Area','Kitchen','Wi-Fi','Study Lounge'], 'https://picsum.photos/seed/rsu-e/900/600'),
  ('Hostel F', 'HF', 'male', 50000, 'Male hostel F — spacious common areas.',
   array['Laundry Area','Kitchen','Wi-Fi','Common Room'], 'https://picsum.photos/seed/rsu-f/900/600'),
  ('Hostel G', 'HG', 'male', 50000, 'Male hostel G — close to the main gate and transport.',
   array['Laundry Area','Kitchen','Wi-Fi','Study Lounge'], 'https://picsum.photos/seed/rsu-g/900/600');

-- ----- Floors -> Wings (A–E) -> Rooms -> Bed spaces -------------------------
-- NDDC: 5 floors x 5 wings x 7 rooms = 175 rooms (700 beds).
-- Others: 4 floors x 5 wings x 4 rooms = 80 rooms (320 beds each).
with cfg as (
  select * from (values
    ('NDDC Hostel', 5, 7),
    ('Hostel A', 4, 4), ('Hostel B', 4, 4), ('Hostel C', 4, 4),
    ('Hostel D', 4, 4), ('Hostel H', 4, 4),
    ('Hostel E', 4, 4), ('Hostel F', 4, 4), ('Hostel G', 4, 4)
  ) as t(name, floor_count, rooms_per_wing)
),
h as (
  select ho.id, ho.name, cfg.floor_count, cfg.rooms_per_wing
  from public.hostels ho join cfg on cfg.name = ho.name
),
ins_floors as (
  insert into public.floors (hostel_id, number, label)
  select h.id, f.n, 'Floor ' || f.n
  from h cross join lateral generate_series(1, h.floor_count) as f(n)
  returning id, hostel_id, number
),
ins_wings as (
  insert into public.wings (hostel_id, floor_id, letter, label)
  select fl.hostel_id, fl.id, chr(64 + w.n)::char(1), 'Wing ' || chr(64 + w.n)
  from ins_floors fl cross join generate_series(1, 5) as w(n)
  returning id, hostel_id, floor_id, letter
),
ins_rooms as (
  insert into public.rooms (hostel_id, floor_id, wing_id, room_number, capacity)
  select wg.hostel_id, wg.floor_id, wg.id,
         'F' || fl.number || '-' || wg.letter || lpad(r.n::text, 2, '0'),
         4
  from ins_wings wg
  join ins_floors fl on fl.id = wg.floor_id
  join h on h.id = wg.hostel_id
  cross join lateral generate_series(1, h.rooms_per_wing) as r(n)
  returning id, hostel_id
)
insert into public.bed_spaces (hostel_id, room_id, bed_number, position)
select rm.hostel_id, rm.id, b.n,
       case b.n
         when 1 then 'Bunk 1 - Bottom'
         when 2 then 'Bunk 1 - Top'
         when 3 then 'Bunk 2 - Bottom'
         else        'Bunk 2 - Top'
       end
from ins_rooms rm cross join generate_series(1, 4) as b(n);

-- ----- Demo occupancy (sprinkle some reserved/occupied beds for realism) ----
update public.bed_spaces b
set status = (case when random() < 0.5 then 'occupied' else 'reserved' end)::public.bed_status
where b.id in (
  select id from public.bed_spaces order by random() limit 600
);

-- Keep room.status roughly consistent with bed availability.
update public.rooms r set status = 'occupied'
where not exists (
  select 1 from public.bed_spaces b where b.room_id = r.id and b.status = 'available'
);

-- =============================================================================
-- AFTER you sign up in the app, promote yourself to admin by running:
--   update public.profiles set role = 'super_admin' where email = 'you@example.com';
-- =============================================================================
