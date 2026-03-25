-- Clear HR attendance data (Postgres / Supabase SQL Editor)
--
-- Open Supabase → SQL Editor → paste ONE chosen block below → Run.
-- (Runs as DB owner; RLS does not block this.)
--
-- Backup first if unsure:
--   Supabase Dashboard → Database → Backups, or pg_dump --table=hr_attendance

-- ---------------------------------------------------------------------------
-- A) Delete only wrong year (e.g. 2001 import mistake) — keeps 2026 rows
-- ---------------------------------------------------------------------------
-- DELETE FROM public.hr_attendance
-- WHERE EXTRACT(YEAR FROM work_date) = 2001;

-- ---------------------------------------------------------------------------
-- B) Keep only one calendar year (example: 2026)
-- ---------------------------------------------------------------------------
-- DELETE FROM public.hr_attendance
-- WHERE work_date < DATE '2026-01-01' OR work_date > DATE '2026-12-31';

-- ---------------------------------------------------------------------------
-- C) Remove EVERY attendance row (employees in hr_employees are unchanged)
-- ---------------------------------------------------------------------------
-- TRUNCATE TABLE public.hr_attendance;

-- ---------------------------------------------------------------------------
-- Optional: payout tables if summaries are now wrong (uncomment if needed)
-- Order: child first, or TRUNCATE ... CASCADE on batches
-- ---------------------------------------------------------------------------
-- TRUNCATE TABLE public.hr_employee_payouts;
-- TRUNCATE TABLE public.hr_payout_batches;
