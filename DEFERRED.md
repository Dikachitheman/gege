# Deferred features

Tracked here so they aren't lost. These are intentionally **not built yet** —
the current focus is the core student journey (sign up → browse → reserve bed →
apply → simulated payment → allocation reflected on dashboard).

| # | Feature | Notes / when picked up |
|---|---------|------------------------|
| 1 | **Allocation letter PDF + QR code** | The allocation *record* and dashboard status ARE built. Only the downloadable, QR-verified PDF letter is deferred. DB already stores `letter_ref` + `qr_payload` on `allocations`, so the PDF can be generated later with no schema change. |
| 2 | **Complaints module** | Students submitting complaints / uploading evidence, and staff replying. The `complaints` table + RLS already exist in the schema, so this is UI-only work later. |
| 3 | **Admin dashboard** | Charts (occupancy, revenue, gender split), management tables (students/hostels/rooms/beds/payments), and report export (PDF/Excel/CSV). The `super_admin` / `hostel_admin` roles, `is_staff()` checks, and `approve_application` RPC already exist server-side. |

## Decisions captured
- **Payments are simulated** — no Paystack or any real provider. The payment screen
  mimics processing, then records a `payments` row and (on full/sufficient payment)
  auto-finalizes the allocation via the `finalize_my_allocation` RPC (since the admin
  approval UI is deferred).
- **No email confirmation** on sign up (must be turned off in Supabase Auth settings —
  see `GUIDE.md`).

When you're ready to build any of these, just say e.g. "build the complaints module".
