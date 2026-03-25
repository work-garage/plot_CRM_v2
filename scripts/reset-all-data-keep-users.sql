-- FULL reset: delete all app data + delete all auth users EXCEPT one admin UUID.
-- Safe for Supabase SQL Editor (runs as DB owner; RLS does not block this).
--
-- Admin to KEEP:
--   17a44e90-a342-4b22-9bc4-5e7777297470
--
-- What this does:
-- 1) Truncates almost all public tables (includes HR attendance/payout tables).
-- 2) Deletes all rows from auth.users except the admin UUID above.
--
-- IMPORTANT:
-- - Backup first.
-- - This is destructive and cannot be undone.
-- - Keep `spatial_ref_sys` (system table) untouched.

BEGIN;

DO $$
DECLARE
  keep_admin_uuid constant uuid := '17a44e90-a342-4b22-9bc4-5e7777297470'::uuid;
  admin_exists boolean;
  targets text;
BEGIN
  -- Guard: ensure the admin user exists before deleting others.
  SELECT EXISTS(SELECT 1 FROM auth.users u WHERE u.id = keep_admin_uuid) INTO admin_exists;
  IF NOT admin_exists THEN
    RAISE EXCEPTION 'Admin UUID % not found in auth.users. Aborting reset.', keep_admin_uuid;
  END IF;

  -- Truncate all public tables except system table.
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
  INTO targets
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> 'spatial_ref_sys';

  IF targets IS NULL OR targets = '' THEN
    RAISE NOTICE 'No tables matched for truncation.';
  ELSE
    EXECUTE 'TRUNCATE TABLE ' || targets || ' RESTART IDENTITY CASCADE';
    RAISE NOTICE 'Truncated tables: %', targets;
  END IF;

  -- Delete all auth users except the chosen admin.
  DELETE FROM auth.users
  WHERE id <> keep_admin_uuid;

  RAISE NOTICE 'Deleted all auth users except admin %', keep_admin_uuid;
END $$;

COMMIT;

-- If you only want HR reset (attendance/payout only), use scripts/clear-hr-attendance.sql instead.
