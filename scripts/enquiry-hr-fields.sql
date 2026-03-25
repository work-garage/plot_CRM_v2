-- Run in Supabase SQL editor if you apply migrations manually.
-- Adds enquiry CRM fields + hr_employees.birth_date for messaging birthdays.

ALTER TABLE public.enquiry_customers
  ADD COLUMN IF NOT EXISTS follow_up_date date;

ALTER TABLE public.enquiry_customers
  ADD COLUMN IF NOT EXISTS interested_plan text;

ALTER TABLE public.enquiry_customers
  ADD COLUMN IF NOT EXISTS enquiry_status text DEFAULT 'new';

UPDATE public.enquiry_customers SET enquiry_status = 'new' WHERE enquiry_status IS NULL;

ALTER TABLE public.enquiry_customers
  ALTER COLUMN enquiry_status SET NOT NULL;

ALTER TABLE public.enquiry_customers
  ALTER COLUMN enquiry_status SET DEFAULT 'new';

ALTER TABLE public.enquiry_customers
  DROP CONSTRAINT IF EXISTS enquiry_customers_enquiry_status_check;

ALTER TABLE public.enquiry_customers
  ADD CONSTRAINT enquiry_customers_enquiry_status_check
  CHECK (enquiry_status IN ('new', 'contacted', 'follow_up', 'joined', 'not_interested'));

ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS birth_date date;
