# RSU Hostel Allocation System

A production-style demo for hostel allocation at **Rivers State University**. Students
sign up, browse gender-matched hostels, pick an exact bed space on a live colour-coded
map, pay (simulated), and get allocated — all online.

## Tech stack
- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** + shadcn-style components (Radix UI)
- **Supabase** (Postgres, Auth, Row Level Security, Realtime)
- **TanStack Query**, **React Hook Form** + **Zod**, **React Router**, **Recharts**, **Lucide**

## Quick start
```bash
npm install
cp .env.example .env      # then fill in your Supabase URL + anon key
npm run dev
```
Then create the database tables by running [`supabase/setup.sql`](supabase/setup.sql)
in the Supabase SQL Editor. Full instructions: **[GUIDE.md](GUIDE.md)**.

## Features
- 🔐 Email/password auth (no email confirmation), role-based access (student / staff)
- 🏠 9 hostels — female: NDDC, A, B, C, D, H · male: E, F, G
- 🛏️ Floor → Wing (A–E) → Room → Bed selection with a live availability map
- ⚡ Atomic bed reservation (no double-booking) + Supabase Realtime
- 💳 Simulated payments — full or installment (no real provider)
- ✅ Auto-allocation on full payment; one allocation per student
- 🧭 Dashboard with status cards + timeline, notifications, profile, dark mode
- 📄 Printable allocation slip
- 📱 Fully responsive

## Project structure
```
src/
  components/        UI primitives (ui/), layout, shared widgets
  hooks/             useJourney (student state + guards)
  lib/               supabase, api (all queries), auth, tables (name registry), utils
  pages/             landing, login, register, dashboard, hostels, hostel-detail,
                     payment, allocation, profile, notifications, guide
  types/             domain types
supabase/
  migrations/        0001_schema, 0002_rls, 0003_seed
  setup.sql          all three concatenated — run this once
```

## Database table names
Every table/RPC name is centralised in [`src/lib/tables.ts`](src/lib/tables.ts). If your
live tables use a prefix, change `PREFIX` there in one place.

## Deferred features
See [DEFERRED.md](DEFERRED.md): allocation-letter PDF + QR, complaints module, admin dashboard.

> Demo project — payments are simulated and no real money is involved.
