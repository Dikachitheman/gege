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
