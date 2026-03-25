-- Employee attendance & payouts (admin-managed)

CREATE TYPE public.hr_salary_type AS ENUM ('monthly', 'daily', 'hourly');
CREATE TYPE public.hr_attendance_type AS ENUM ('present', 'leave', 'holiday');
CREATE TYPE public.hr_payout_batch_status AS ENUM ('draft', 'approved', 'paid');
CREATE TYPE public.hr_employee_payout_status AS ENUM ('pending', 'partial', 'paid');

CREATE TABLE public.hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  employee_code TEXT NOT NULL UNIQUE,
  phone TEXT,
  staff_role TEXT NOT NULL DEFAULT 'employee' CHECK (staff_role = 'employee'),
  salary_type public.hr_salary_type NOT NULL DEFAULT 'monthly',
  salary_rate NUMERIC NOT NULL CHECK (salary_rate >= 0),
  overtime_rate NUMERIC NOT NULL DEFAULT 0 CHECK (overtime_rate >= 0),
  required_hours_per_week NUMERIC NOT NULL DEFAULT 48 CHECK (required_hours_per_week > 0),
  grace_hours NUMERIC NOT NULL DEFAULT 0 CHECK (grace_hours >= 0),
  deduction_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.hr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  in_time TIME,
  out_time TIME,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  overtime_minutes INTEGER NOT NULL DEFAULT 0 CHECK (overtime_minutes >= 0),
  attendance_type public.hr_attendance_type NOT NULL DEFAULT 'present',
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, work_date)
);

CREATE INDEX idx_hr_attendance_employee_date ON public.hr_attendance(employee_id, work_date);

CREATE TABLE public.hr_payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_label TEXT NOT NULL,
  status public.hr_payout_batch_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (month_label)
);

CREATE TABLE public.hr_employee_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.hr_payout_batches(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  total_days INTEGER NOT NULL DEFAULT 0,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  overtime_hours NUMERIC NOT NULL DEFAULT 0,
  required_hours NUMERIC NOT NULL DEFAULT 0,
  short_hours NUMERIC NOT NULL DEFAULT 0,
  deduction_amount NUMERIC NOT NULL DEFAULT 0,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  overtime_pay NUMERIC NOT NULL DEFAULT 0,
  final_salary NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  payout_status public.hr_employee_payout_status NOT NULL DEFAULT 'pending',
  weekly_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, employee_id)
);

CREATE INDEX idx_hr_payouts_batch ON public.hr_employee_payouts(batch_id);

ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_payouts ENABLE ROW LEVEL SECURITY;

-- Admin-only (JWT user_metadata.role = 'admin')
CREATE POLICY hr_employees_admin_all ON public.hr_employees
  FOR ALL USING (
    COALESCE((auth.jwt()->'user_metadata'->>'role'), '') = 'admin'
  )
  WITH CHECK (
    COALESCE((auth.jwt()->'user_metadata'->>'role'), '') = 'admin'
  );

CREATE POLICY hr_attendance_admin_all ON public.hr_attendance
  FOR ALL USING (
    COALESCE((auth.jwt()->'user_metadata'->>'role'), '') = 'admin'
  )
  WITH CHECK (
    COALESCE((auth.jwt()->'user_metadata'->>'role'), '') = 'admin'
  );

CREATE POLICY hr_payout_batches_admin_all ON public.hr_payout_batches
  FOR ALL USING (
    COALESCE((auth.jwt()->'user_metadata'->>'role'), '') = 'admin'
  )
  WITH CHECK (
    COALESCE((auth.jwt()->'user_metadata'->>'role'), '') = 'admin'
  );

CREATE POLICY hr_employee_payouts_admin_all ON public.hr_employee_payouts
  FOR ALL USING (
    COALESCE((auth.jwt()->'user_metadata'->>'role'), '') = 'admin'
  )
  WITH CHECK (
    COALESCE((auth.jwt()->'user_metadata'->>'role'), '') = 'admin'
  );
