-- Unique phone for CRM customers (one customer record per phone).
-- If this fails, remove duplicate `customers.phone` values first, then re-run.
-- Unique phone for HR employees when set (partial index: multiple NULLs allowed).

CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique
  ON public.customers (phone);

CREATE UNIQUE INDEX IF NOT EXISTS hr_employees_phone_unique
  ON public.hr_employees (phone)
  WHERE phone IS NOT NULL;
