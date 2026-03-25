# S-Infra CRM - Features Documentation

## UI Pages & Routes

### Admin Routes

| Route | Description |
|-------|-------------|
| `/dashboard` | Full business analytics, charts, filters. |
| `/reports` | Project-specific analytics via project selector; overview when none selected. |
| `/projects` | List projects, create/edit. Plot layout grid. |
| `/advisors` | Advisors CRUD. |
| `/customers` | Customer cards; advisor "Not assigned" when null. |
| `/enquiries` | Enquiries with filters. |
| `/sales` | Sales cards with filters; **Remind payment** (WhatsApp) when due. Collect Payment link. |
| `/sales/new` | Sale form: Advisor or Admin direct, EMI, follow-up date on sale (no messaging reminder). |
| `/payments` | Server-filtered payment list. **Payment messages** (templates). **EMI** modal. Row **Remind** when due. Detail modal: receipt PDF, WhatsApp. |
| `/commissions` | Commissions + extra paid. |
| `/expenses` | Expenses with filters and insights. |
| `/messaging` | Messaging tasks (no payment-installment type). Birthdays today. Filters. `/reminders` redirects here. |
| `/messaging/new` | New task form. |
| `/hr` | HR hub (admin). |
| `/hr/employees` | Employee master (`hr_employees`). |
| `/hr/attendance` | Attendance: **Excel or CSV** Work Duration upload (preview → confirm), responsive table + filters. |
| `/hr/payouts` | Generate monthly payouts (YYYY-MM), record partial payments. |

### Advisor Routes (`/advisor/*`)

- `/advisor/messaging` and `/advisor/messaging/new` (legacy `/advisor/reminders*` redirect)

---

## Payment follow-ups vs messaging

- **No** `installment_due` rows are created from the sale form anymore.
- `getReminders()` excludes `installment_due` at the database level.
- **Due detection** (`lib/payment-due.ts`): outstanding balance and (EMI due date / follow-up date today or overdue).
- **WhatsApp**: `lib/payment-whatsapp.ts` + **Payment messages** modal (`components/payments/payment-templates-modal.tsx`).

---

## API Routes (HR, admin JWT)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/hr/employees` | List / create employees |
| GET | `/api/hr/attendance` | Query `employee_id`, `from`, `to` |
| POST | `/api/hr/attendance/upload` | Multipart **`.csv`** Work Duration report; `dryRun=1` = parse only, else upsert |
| GET | `/api/hr/payouts` | List batches with payout rows |
| POST | `/api/hr/payouts/generate` | Body `{ "month": "YYYY-MM" }` |
| POST | `/api/hr/payouts/pay` | Body `{ "id": "<payout row>", "paid_amount": number }` |

---

## Server actions (existing)

### Sales (`app/actions/sales.ts`)

- `createSale` — does **not** insert payment reminders; revalidates `/messaging`.
- `getSales()` — adds `payment_due_meta` per sale for UI.

### Payments (`app/actions/payments.ts`)

- `getPayments(filters?)` — server-side date/status/mode filters; enriches rows with `payment_due_meta`.

### Reminders / messaging (`app/actions/reminders.ts`)

- `getReminders()` — excludes `installment_due`; `revalidatePath("/messaging")`.

### HR (`app/actions/hr.ts`)

- `listHrEmployees`, `listHrAttendance`, `listHrPayoutBatches`, `createHrEmployee` (admin only).

---

## Attendance — Work Duration report

Upload **`.xlsx` / `.xls`** directly, or **`.csv`** (UTF-8) if you prefer. The server converts Excel to the same cell grid as CSV, then parses. Tolerates header noise, repeating employee blocks, dates as columns, In/Out/Duration/OT rows, and `(SE)`-style suffixes on times. **Upload** → preview → **Confirm import**. Employee codes must exist in `hr_employees`.

---

## Performance notes

- Payments list uses **filtered Supabase queries** instead of loading all rows client-side.
- Route-level **loading.tsx** for `payments`, `sales`, `messaging` shows skeletons during navigation.

---

## Birthdays

- `app/actions/customers.ts` and `app/actions/advisors.ts` sync birthday tasks into `reminders` when `birth_date` is set (create/update).

---

## Edge cases

- Legacy reminders with type `installment_due` may still exist in DB; they are hidden from messaging lists. Edit form can show a legacy option when editing such a row.
- HR APIs return 503 if migrations are not applied.
