# MG Infra CRM — System Audit Report

**Date:** March 2025  
**Scope:** Full project scan, schema, routes, components, business logic

---

## 1. CRITICAL ISSUES (Must Fix)

### 1.1 Schema vs App Mismatch — Sale Phase
| Schema (DB) | App (validation/UI) |
|-------------|---------------------|
| `face1`, `face2`, `face3`, `face4`, `face5`, `face6` | `token`, `agreement`, `registry`, `full_payment` |

**Impact:** `createSale` inserts `sale_phase: "token"` → **INSERT fails** (invalid enum value).

**Fix:** Migration to extend `sale_phase` enum, or map app→DB in `sales.ts` (token→face1, agreement→face2, etc.). Mapping avoids enum migration; display maps back.

---

### 1.2 Missing Table — `advisor_project_commissions`
- **Referenced by:** `sales.ts`, `advisor-projects.ts`, `project-advisor-assignments.tsx`
- **Schema:** Table does not exist in `schema.sql`
- **Impact:** Sales creation fails; advisor assignment fails.

**Fix:** Add migration to create this table.

---

### 1.3 Missing Columns — `projects`
- **Used in:** `project-actions.ts` (create/update)
- **Missing:** `min_plot_rate`, `starting_plot_number`
- **Impact:** Project create/update fails with "column does not exist".
- **Note:** `layout_expense` exists; `projectSchema` and form omit `min_plot_rate` and `starting_plot_number`.

**Fix:** Add columns + update validation + form.

---

### 1.4 Sales 404 — No `/sales/[id]` Route
- **Sales page:** `Link href={/sales/${sale.id}}` → 404
- **payments.ts:** `revalidatePath(\`/sales/${sale_id}\`)` — route does not exist

**Fix:** Add `/sales/[id]` page OR convert to modal (modal preferred per Phase 2).

---

## 2. BUSINESS LOGIC

### 2.1 Commission Logic
**Current:** Commission stored in `advisor_commissions` at sale creation. Uses `advisor_project_commissions` (token/agreement/registry/full_payment %) × sale amount.

**User requirement:**
```
profit = selling_price - base_price
received = sum(pakka payments)
ratio = received / selling_price
advisor_earning = profit × ratio
```

**Gap:** Current logic uses `total_sale_amount * commission%`, not dynamic profit-based. Need plots `base_price` and sale `selling_price` for profit calc. Base price may be `plots.rate_per_sqft * size_sqft` or a separate field.

**Recommendation:** Add `base_price` to plot_sales (or derive from plot), then compute advisor earning dynamically per formula. Remove static `total_commission_amount` storage or make it "expected" only; actual = dynamic.

---

### 2.2 Expense Categories Mismatch
| Schema | App (expense form) |
|--------|-------------------|
| salary, utilities, maintenance, marketing, misc | office, marketing, travel, layout_dev, legal, salary, misc |

**Fix:** Align enum or map; update validation.

---

## 3. DUPLICATE / INCONSISTENT

- **Formatters:** `utils/formatter.ts` and `lib/utils/formatters.ts` — consolidate.
- **Path separators:** Mixed `(dashboard)` vs `\(dashboard)` — cosmetic.

---

## 4. ADVISOR LOGIN (New Feature)

**Requirement:** Advisors can login; admin creates advisor with phone + password (default = phone).

**Current:** Login uses Supabase Auth (`email` + `password`). No advisor-specific auth.

**Approach:**
1. Add `email` and `password_hash` to `advisors` (or link to `auth.users`).
2. Option A: Use Supabase Auth — create auth user per advisor (email = advisor phone or generated).
3. Option B: Custom credentials table — `advisor_credentials(advisor_id, phone, password_hash)`; custom login API.

**Recommended:** Supabase Auth. On advisor create:
- Create auth user with `email: advisor_phone@mginfra.local` (or similar), `password: phone` (or admin-set).
- Add `auth_user_id` to `advisors` table.
- Advisor login uses phone (as identifier) + password.
- Middleware: check `auth.role` or `user_metadata.role` for advisor vs admin.

---

## 5. NAVIGATION / UX

- **Current:** Full-page navigation for detail/edit (customers, advisors, plots, etc.).
- **Target (Phase 2):** Table + clickable cells → modals (view/edit/create).
- **Status:** Not implemented; requires refactor of list pages and new modal components.

---

## 6. SUGGESTED FIX ORDER

1. **DB migration** — advisor_project_commissions, projects cols, sale_phase mapping
2. **Fix project form/schema** — min_plot_rate, starting_plot_number
3. **Fix sales** — sale_phase mapping in insert, sale detail modal (replace 404 link)
4. **Fix payments** — revalidatePath to existing routes only
5. **Advisor credentials** — schema + create flow + login
6. **Advisor analytics** — new routes, earnings, dues

---

## 7. FILES MODIFIED (Implemented)

| File | Changes |
|------|---------|
| `supabase/migrations/20250316000001_fix_schema_mismatches.sql` | New migration |
| `lib/validations/project.ts` | Added min_plot_rate, starting_plot_number |
| `components/projects/project-form.tsx` | Added fields |
| `app/actions/sales.ts` | sale_phase uses app values (token, etc.) |
| `app/(dashboard)/sales/page.tsx` | SaleDetailModal instead of 404 link |
| `components/sales/sale-detail-modal.tsx` | New |
| `components/sales/sales-list.tsx` | New - clickable cards + modal |
| `app/actions/payments.ts` | Removed invalid revalidatePath |
| `advisors` table + form | Added email, password, auth_user_id |
| `app/(auth)/login/page.tsx` | Admin + Advisor login tabs |
| `lib/supabase/admin.ts` | Service role client for auth user creation |
| `app/actions/advisors.ts` | createAdvisor creates auth user, getAdvisorAnalytics |
| `app/(dashboard)/advisors/[id]/page.tsx` | Full detail + analytics |

## 8. ENV SETUP

Add to `.env.local` for advisor login:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 9. IMPORTANT: Schema cache errors

If the app shows:
> Could not find the 'email' column of 'advisors' in the schema cache

It means the DB migration was not applied yet (or PostgREST hasn’t refreshed).
Run the migration SQL in Supabase, then wait briefly (or restart the API).
