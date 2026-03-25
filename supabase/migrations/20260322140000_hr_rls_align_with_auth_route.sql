-- HR RLS: align with lib/hr/auth-route.ts isAdminUser()
-- Previously policies required user_metadata.role = 'admin' exactly, so users with
-- no role set (common for email signups) passed the app but failed INSERT/UPSERT.

CREATE OR REPLACE FUNCTION public.hr_is_admin_app_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT (
    lower(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), ''))) IN ('admin', 'superadmin', 'owner')
    OR nullif(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '')), '') IS NULL
  )
  AND lower(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), ''))) <> 'advisor';
$$;

GRANT EXECUTE ON FUNCTION public.hr_is_admin_app_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hr_is_admin_app_user() TO service_role;

DROP POLICY IF EXISTS hr_employees_admin_all ON public.hr_employees;
DROP POLICY IF EXISTS hr_attendance_admin_all ON public.hr_attendance;
DROP POLICY IF EXISTS hr_payout_batches_admin_all ON public.hr_payout_batches;
DROP POLICY IF EXISTS hr_employee_payouts_admin_all ON public.hr_employee_payouts;

CREATE POLICY hr_employees_admin_all ON public.hr_employees
  FOR ALL
  USING (public.hr_is_admin_app_user())
  WITH CHECK (public.hr_is_admin_app_user());

CREATE POLICY hr_attendance_admin_all ON public.hr_attendance
  FOR ALL
  USING (public.hr_is_admin_app_user())
  WITH CHECK (public.hr_is_admin_app_user());

CREATE POLICY hr_payout_batches_admin_all ON public.hr_payout_batches
  FOR ALL
  USING (public.hr_is_admin_app_user())
  WITH CHECK (public.hr_is_admin_app_user());

CREATE POLICY hr_employee_payouts_admin_all ON public.hr_employee_payouts
  FOR ALL
  USING (public.hr_is_admin_app_user())
  WITH CHECK (public.hr_is_admin_app_user());
