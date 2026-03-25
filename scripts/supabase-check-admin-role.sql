-- =============================================================================
-- Check and fix Auth user role for HR / admin API (Supabase SQL Editor)
-- =============================================================================
-- The app treats users as:
--   - advisor  → role = 'advisor' in user_metadata (CRM advisor portal)
--   - admin    → anyone else (including users with NO role in metadata)
--
-- If HR still returns 403, you may be logged in as an advisor, or metadata
-- has an unexpected role string. Use the queries below to inspect and fix.
-- =============================================================================

-- 1) LIST all auth users (id, email, metadata)
SELECT
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data  AS user_metadata,
  raw_app_meta_data   AS app_metadata
FROM auth.users
ORDER BY created_at DESC;

-- 2) Find users that look like advisors (have role advisor)
SELECT id, email, raw_user_meta_data->>'role' AS role
FROM auth.users
WHERE (raw_user_meta_data->>'role') = 'advisor';

-- 3) SET admin role explicitly for ONE user by email (safe merge, keeps other keys)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
WHERE email = 'YOUR_ADMIN_EMAIL@example.com';

-- 4) REMOVE wrong role so "empty role" admin logic applies (optional)
-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data - 'role'
-- WHERE email = 'YOUR_ADMIN_EMAIL@example.com';

-- 5) After changes: user must sign out and sign in again (or wait for JWT refresh)
--    so the new metadata is in the session cookie.
