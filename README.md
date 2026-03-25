# MG Infra CRM (Estate Management + CRM)

This is a **Next.js App Router + Supabase** CRM for managing:
- Projects & plots
- Customers & advisors
- Sales/bookings and payment collections
- Advisor commissions (project-wise)
- Messaging (CRM follow-ups + birthdays; payment follow-ups use Payments/Sales WhatsApp)
- HR (admin): employees, attendance upload, payroll payouts

It supports **two roles**:
- **Admin**: full access
- **Advisor**: standalone CRM portal limited to their data

---

## 1) Roles & Login

### Admin login
- Uses Supabase Auth email/password.
- Route: `/login` � Admin tab � redirects to `/dashboard`.

### Advisor login (phone + password)
- Advisors login from `/login` � Advisor tab.
- Advisors are created by Admin from `/advisors`.
- **Default password** is **advisor phone number** (admin can set a custom password at creation time).

**Important env**
Create advisor auth users requires:

```
SUPABASE_SERVICE_ROLE_KEY=...
```

Without it, advisors can still be created in DB, but **their Auth user wont be created automatically**, so advisor login will fail until configured.

---

## 2) Navigation & Route Groups

### Admin app
All existing routes are preserved:
- `/dashboard`
- `/projects`, `/projects/[id]`, `/projects/[id]/plots/...`
- `/advisors`, `/advisors/[id]`, `/advisors/analytics`
- `/customers`
- `/sales`
- `/payments`
- `/commissions`
- `/messaging` (legacy `/reminders` redirects)
- `/hr`, `/hr/employees`, `/hr/attendance`, `/hr/payouts` (admin HR; run migration `20260322000000_hr_attendance_payouts.sql`)

### Advisor standalone portal
Advisors are constrained to the `/advisor` route group:
- `/advisor` (dashboard)
- `/advisor/customers`
- `/advisor/sales`
- `/advisor/payments`
- `/advisor/messaging` (legacy `/advisor/reminders` redirects here)

Middleware redirects advisors away from admin routes.

---

## 3) Core Data Model (Supabase)

### Key tables
- `projects` � land projects
- `plots` � plots under each project
- `customers` � buyers/leads (linked to `advisors` via `advisor_id`)
- `advisors` � channel partners (includes `email`, `auth_user_id`)
- `plot_sales` � booking/sale (plot + customer + advisor)
- `payments` � installment collections (kaccha/pakka)
- `advisor_commissions` � commission ledger per sale
- `advisor_project_commissions` � **project-wise Face rates** per advisor
- `reminders` � messaging tasks (excludes legacy `installment_due` rows from listings)
- `hr_employees`, `hr_attendance`, `hr_payout_batches`, `hr_employee_payouts` � HR module (after migration)

### Commission configuration model (IMPORTANT)
Commission is **not stored on the advisor** as face %.

Instead, commission is configured **per project** when assigning advisor:
- Project � Advisor Assignment & Face Rates � Manage � set:
  - Face 1 rate (�/sqft)
  - Face 2 rate (�/sqft)
  - Face 3 rate (�/sqft)
  - Face 4 rate (�/sqft)

---

## 4) Commission Calculation (current)

When a sale is created:
1. System checks advisor is assigned to that project in `advisor_project_commissions`
2. Gets the Face rate (�/sqft) based on `sale_phase` (token/agreement/registry/full_payment)
3. Commission amount is computed as:

\[
\text{commission} = \text{plot.size_sqft} \times \text{face_rate}
\]

Commission is written to `advisor_commissions`.

---

## 5) UX patterns

### Admin advisors
- `/advisors` is now table-driven with:
  - View modal
  - Create modal
  - Edit modal

### Project-wise rate management
- `/projects/[id]` � Advisor Assignment & Face Rates opens a modal for assignment & rates.

### Sales details
- `/sales` uses clickable cards and opens **Sale Detail modal** (avoids `/sales/[id]` route).

---

## 6) Messaging & payments

- `/messaging` lists non-payment tasks + **Birthdays Today**. Legacy URLs `/reminders` redirect here.
- **Payment follow-ups** are not stored as reminders: use **Remind** on **Payments** or **Sales** (WhatsApp) when a balance is due (EMI/follow-up/overdue). Configure default text via **Payment messages** on the Payments page.
- Templates for messaging tasks: **Change Templates** modal.
- Advisor messaging (`/advisor/messaging`) only shows tasks linked to their customers (or self).

### HR (admin)

- Apply migrations `20260322000000_hr_attendance_payouts.sql` and `20260322140000_hr_rls_align_with_auth_route.sql` (or run `scripts/fix-hr-rls-admin.sql` if inserts fail with RLS while you can use the dashboard).
- Attendance: upload **Work Duration** report as **Excel (.xlsx/.xls)** or **CSV** on `/hr/attendance` (preview, then confirm). Employee codes must exist in `hr_employees`.
- API: `/api/hr/employees`, `/api/hr/attendance`, `/api/hr/attendance/upload`, `/api/hr/payouts`, `/api/hr/payouts/generate`, `/api/hr/payouts/pay`.

---

## 7) Required DB Migration (to avoid runtime errors)

If you see errors like:
> Could not find the 'email' column of 'advisors' in the schema cache

Run the migration:
- `supabase/migrations/20250316000001_fix_schema_mismatches.sql`

Then, in Supabase:
- Wait a minute for schema cache refresh, OR
- Restart the API (if needed)

---

## 8) Dev scripts

```
npm install
npm run dev
```

---

## 9) Recent Features

- **Customer advisor "Not assigned"**: When no advisor selected, shows "Not assigned" on cards.
- **Admin direct sell**: Sale form "Sold By" → Admin (Direct); uses plot min rate, no commission.
- **EMI & follow-up date**: Sale form supports EMI months (auto-fills monthly EMI) and follow-up date on `plot_sales` (payment nudges use Payments/Sales **Remind**, not messaging tasks).
- **EMI Modal**: Payments page "EMI" button → list of EMI sales, next due, Remind via WhatsApp.
- **Messaging**: `/messaging` replaces `/reminders` (redirect). No payment-installment tasks in messaging list.
- **Payment WhatsApp**: **Payment messages** templates on Payments; **Remind** column when payment is due.
- **Receipt generation**: Post-sale Share Receipt modal; PDF receipt, share via WhatsApp.
- **Share Receipt (payments)**: Payment detail panel has Share Receipt button when receipt exists.
- **Dashboard / Reports swap**: Dashboard = full analytics; Reports = project selector + project-specific analytics.
- **Sold by Admin/Advisor**: Reports Top Advisors shows "Admin (Direct)" for admin sales.

See [docs/FEATURES.md](docs/FEATURES.md) for full UI, API, forms, modals, and edge cases.

