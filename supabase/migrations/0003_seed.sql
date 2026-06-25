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
