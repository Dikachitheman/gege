# RSU Hostel Allocation System — Setup & Navigation Guide

This is a demo web app for hostel allocation at Rivers State University. Students
sign up, browse hostels for their gender, pick an exact bed space, pay (simulated),
and get allocated — all online.

---

## Part 1 — One-time setup (do this once)

### 1. Create the database tables
The schema lives in [`supabase/setup.sql`](supabase/setup.sql).

- Open your Supabase project → **SQL Editor** → New query.
- Paste the whole contents of `supabase/setup.sql` and click **Run**.
- This creates all tables, security rules, the 9 hostels, and all rooms/beds.

> Re-running `setup.sql` is safe — it resets the catalogue and re-seeds it. Your
> logins (auth users) are **not** deleted.

### 2. Turn OFF email confirmation (important)
So sign up works instantly with no email step:

- Supabase Dashboard → **Authentication** → **Sign In / Providers** → **Email**.
- Turn **Confirm email** **OFF** and save.

### 3. Add your keys to `.env`
- `VITE_SUPABASE_URL` — your project URL.
- `VITE_SUPABASE_ANON_KEY` — Dashboard → **Project Settings → API → anon public**.

### 4. Run the app
```bash
npm install
npm run dev
```
Open the URL it prints (usually http://localhost:5173).

### 5. (Optional) Make yourself an admin
After signing up once, in the SQL Editor run:
```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

### Want to start over / "erase the DB so I can sign up again"?
- To wipe **hostel/booking data** only: re-run `supabase/setup.sql`.
- To also remove your **login** so you can sign up with the same email again:
  Dashboard → **Authentication → Users** → delete your user. Then sign up fresh.

---

## Part 2 — How to use the app (step by step)

### Create your account
- Click **Apply Now** (home page) or **Create an account** (sign-in page).
- Fill in every field marked with a red `*`.
- Your **gender** decides which hostels you can apply to — choose carefully.
- Click **Create account** — you're signed straight in (no email confirmation).

**Sample details you can use:**
- Name: `Jane Doe` · Matric: `UG/2021/4567`
- Email: `jane.demo@example.com` · Password: `password123`
- Gender: `Female` · Faculty: `Science` · Dept: `Computer Science` · Level: `300`

### Find a hostel
- Go to **Browse Hostels** in the sidebar.
- You only see hostels for your gender (female: NDDC, A, B, C, D, H · male: E, F, G).
- Each card shows the fee and free beds. **Click a card** to open it.

### Pick your bed space
- Choose a **Floor**, then a **Wing** (A–E), then a **Room**.
- Use **Back** at any step to change an earlier choice.
- On the bed map: 🟢 green = free, 🟡 yellow = reserved, 🔴 red = taken.
- Click a green bed → **Reserve & continue to payment**.

### Make payment (simulated)
- Choose **Pay in full** or **Pay by installment** (at least 50% first).
- No real card or money is used — it's a demo.
- When fully paid, your bed is **confirmed instantly**.

### See your allocation
- Open **My Allocation** to view your hostel, room and bed.
- Use **Print** to print your allocation slip.
- You can't book a second bed — the app shows your current one instead.

### Dashboard, notifications & profile
- The **Dashboard** shows your hostel, application, payment and balance, plus a timeline.
- Click **Edit selection** to change your bed (before allocation).
- The **bell** shows status updates; the **Profile** page updates your details.
- The **moon/sun** button toggles dark mode.

There is also an in-app version of this guide at **How to use** in the sidebar.

---

## Not built yet (deferred)
See [`DEFERRED.md`](DEFERRED.md): allocation-letter PDF + QR code, complaints module,
and the admin dashboard. The database already supports all three.
