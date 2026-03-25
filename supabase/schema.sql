-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE plot_status AS ENUM 
  ('available', 'token', 'agreement', 'sold');

CREATE TYPE payment_mode AS ENUM 
  ('cash', 'online', 'cheque');

CREATE TYPE reminder_type AS ENUM (
  'token_expiry',
  'agreement_expiry', 
  'installment_due',
  'birthday_customer',
  'birthday_advisor',
  'bank_statement',
  'balance_plot',
  'crm_followup',
  'calling',
  'other'
);

CREATE TYPE expense_category AS ENUM
  ('salary', 'utilities', 'maintenance', 'marketing', 'misc');

-- NOTE: App uses these phases (token/agreement/registry/full_payment)
CREATE TYPE sale_phase AS ENUM
  ('token','agreement','registry','full_payment');

-- =============================================
-- TABLE 1: projects
-- One builder can have multiple land projects/layouts
-- =============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  total_plots_count INT NOT NULL DEFAULT 0,
  layout_expense DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 2: plots
-- Each plot belongs to a project
-- Status flows: available → token → agreement → sold
-- =============================================
CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plot_number TEXT NOT NULL,              -- "LT NO-01"
  size_sqft DECIMAL(10,2) NOT NULL,
  rate_per_sqft DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) GENERATED ALWAYS AS 
    (size_sqft * rate_per_sqft) STORED,
  status plot_status DEFAULT 'available',
  facing TEXT,                            -- North/South/East/West
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, plot_number)
);

-- =============================================
-- TABLE 3: advisors (Channel Partners)
-- They sell plots to customers & earn commission
-- Commission is per phase (token/agreement/registry/full_payment)
-- =============================================
CREATE TABLE advisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  birth_date DATE,
  commission_token DECIMAL(10,2) DEFAULT 0,
  commission_agreement DECIMAL(10,2) DEFAULT 0,
  commission_registry DECIMAL(10,2) DEFAULT 0,
  commission_full_payment DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 3B: advisor_project_commissions
-- Project-wise per-phase commission rates (₹/sqft)
-- Used by the app for commission assignment/eligibility.
-- =============================================
CREATE TABLE advisor_project_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  commission_token DECIMAL(10,2) DEFAULT 0,
  commission_agreement DECIMAL(10,2) DEFAULT 0,
  commission_registry DECIMAL(10,2) DEFAULT 0,
  commission_full_payment DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, advisor_id)
);

-- =============================================
-- TABLE 4: customers
-- Buyers of plots, referred by advisors
-- =============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  address TEXT,
  birth_date DATE,
  advisor_id UUID REFERENCES advisors(id) ON DELETE SET NULL,
  route TEXT,                             -- area/locality for grouping
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 5: plot_sales  (CORE TRANSACTION TABLE)
-- When a plot is booked/sold to a customer
-- One plot can only have ONE active sale
-- =============================================
CREATE TABLE plot_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES plots(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  advisor_id UUID NOT NULL REFERENCES advisors(id),
  sale_phase sale_phase NOT NULL,
  token_date DATE,
  agreement_date DATE,
  total_sale_amount DECIMAL(12,2) NOT NULL,
  down_payment DECIMAL(12,2) DEFAULT 0,
  monthly_emi DECIMAL(12,2),
  emi_day INT CHECK (emi_day BETWEEN 1 AND 31), -- which day of month
  amount_paid DECIMAL(12,2) DEFAULT 0,          -- sum updated via trigger
  remaining_amount DECIMAL(12,2),               -- updated via trigger
  is_cancelled BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plot_id)  -- one plot = one sale at a time
);

-- =============================================
-- TABLE 6: payments
-- All payment installments against a sale
-- kaccha = unconfirmed, pakka = confirmed
-- =============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES plot_sales(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  slip_number TEXT,
  receipt_path TEXT,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_mode payment_mode NOT NULL DEFAULT 'cash',
  is_confirmed BOOLEAN DEFAULT false,  -- false=kaccha, true=pakka
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 7: advisor_commissions
-- Per sale commission tracking
-- =============================================
CREATE TABLE advisor_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES advisors(id),
  sale_id UUID NOT NULL REFERENCES plot_sales(id),
  commission_percentage DECIMAL(5,2) NOT NULL,
  total_commission_amount DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  remaining_commission DECIMAL(12,2),           -- updated via trigger
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sale_id)  -- one commission record per sale
);

-- =============================================
-- TABLE 7B: advisor_commission_payments
-- Payment history for advisor commissions
-- =============================================
CREATE TABLE advisor_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES advisor_commissions(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  paid_date DATE NOT NULL,
  payment_mode payment_mode NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  receipt_path TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 8: office_expenses
-- Monthly office running expenses
-- =============================================
CREATE TABLE office_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  category expense_category DEFAULT 'misc',
  receipt_note TEXT,
  receipt_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 8B: customer_documents
-- Customer document management (uploads stored in Supabase Storage)
-- =============================================
CREATE TABLE customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  doc_category TEXT NOT NULL, -- salaried|business
  doc_type TEXT NOT NULL,     -- e.g. aadhar|pan|bank_statement|salary_slip|itr|gst
  file_path TEXT NOT NULL,    -- storage path
  file_name TEXT,
  mime_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 9: staff
-- Office workers for attendance tracking
-- =============================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  daily_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  phone TEXT,
  join_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 10: staff_attendance
-- Daily attendance for salary calculation
-- =============================================
CREATE TABLE staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_present BOOLEAN DEFAULT true,
  half_day BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- =============================================
-- TABLE 11: reminders
-- Central reminder system for all types
-- =============================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type reminder_type DEFAULT 'crm_followup',
  phone TEXT,
  description TEXT,
  reminder_date DATE NOT NULL,
  reminder_time TIME,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES (for performance)
-- =============================================
CREATE INDEX idx_plots_project ON plots(project_id);
CREATE INDEX idx_plots_status ON plots(status);
CREATE INDEX idx_customers_advisor ON customers(advisor_id);
CREATE INDEX idx_sales_plot ON plot_sales(plot_id);
CREATE INDEX idx_sales_customer ON plot_sales(customer_id);
CREATE INDEX idx_sales_advisor ON plot_sales(advisor_id);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_confirmed ON payments(is_confirmed);
CREATE INDEX idx_reminders_date ON reminders(reminder_date);
CREATE INDEX idx_reminders_completed ON reminders(is_completed);
CREATE INDEX idx_commissions_advisor ON advisor_commissions(advisor_id);
CREATE INDEX idx_advisor_project_commissions_project ON advisor_project_commissions(project_id);
CREATE INDEX idx_advisor_project_commissions_advisor ON advisor_project_commissions(advisor_id);
CREATE INDEX idx_customer_documents_customer ON customer_documents(customer_id);
CREATE INDEX idx_commission_payments_commission ON advisor_commission_payments(commission_id);
CREATE INDEX idx_commission_payments_date ON advisor_commission_payments(paid_date);

-- =============================================
-- TRIGGER: Auto-update plot status when sale created
-- =============================================
CREATE OR REPLACE FUNCTION update_plot_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token_date IS NOT NULL AND NEW.agreement_date IS NULL THEN
    UPDATE plots SET status = 'token' WHERE id = NEW.plot_id;
  ELSIF NEW.agreement_date IS NOT NULL THEN
    UPDATE plots SET status = 'agreement' WHERE id = NEW.plot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plot_status
AFTER INSERT OR UPDATE ON plot_sales
FOR EACH ROW EXECUTE FUNCTION update_plot_status();

-- =============================================
-- TRIGGER: Auto-update amount_paid & remaining in plot_sales
-- when a payment is inserted or updated
-- =============================================
CREATE OR REPLACE FUNCTION update_sale_amounts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE plot_sales
  SET 
    amount_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
        AND is_confirmed = true
    ),
    remaining_amount = total_sale_amount - (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
        AND is_confirmed = true
    )
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sale_amounts
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_sale_amounts();

-- =============================================
-- TRIGGER: Prevent confirmed overpayment on sale
-- =============================================
CREATE OR REPLACE FUNCTION prevent_sale_overpayment()
RETURNS TRIGGER AS $$
DECLARE
  sale_total DECIMAL(12,2);
  confirmed_sum DECIMAL(12,2);
BEGIN
  -- only enforce on rows that are confirmed
  IF NEW.is_confirmed IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT total_sale_amount INTO sale_total
  FROM plot_sales
  WHERE id = NEW.sale_id;

  SELECT COALESCE(SUM(amount), 0) INTO confirmed_sum
  FROM payments
  WHERE sale_id = NEW.sale_id
    AND is_confirmed = true
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF confirmed_sum + COALESCE(NEW.amount, 0) > COALESCE(sale_total, 0) THEN
    RAISE EXCEPTION 'Confirmed payments exceed sale total for sale %', NEW.sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_sale_overpayment
BEFORE INSERT OR UPDATE OF amount, is_confirmed, sale_id ON payments
FOR EACH ROW EXECUTE FUNCTION prevent_sale_overpayment();

-- =============================================
-- TRIGGER: Auto-update commission remaining
-- =============================================
CREATE OR REPLACE FUNCTION update_commission_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_commission = NEW.total_commission_amount - NEW.amount_paid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_commission_remaining
BEFORE INSERT OR UPDATE ON advisor_commissions
FOR EACH ROW EXECUTE FUNCTION update_commission_remaining();

-- =============================================
-- TRIGGER: Keep commission totals in sync from payment history
-- =============================================
CREATE OR REPLACE FUNCTION update_commission_totals()
RETURNS TRIGGER AS $$
DECLARE
  comm_id UUID;
  total_paid DECIMAL(12,2);
BEGIN
  comm_id := COALESCE(NEW.commission_id, OLD.commission_id);
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM advisor_commission_payments
  WHERE commission_id = comm_id;

  UPDATE advisor_commissions
  SET amount_paid = total_paid,
      paid_date = CASE
        WHEN total_paid >= total_commission_amount THEN (
          SELECT MAX(paid_date) FROM advisor_commission_payments WHERE commission_id = comm_id
        )
        ELSE NULL
      END
  WHERE id = comm_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_commission_totals
AFTER INSERT OR UPDATE OR DELETE ON advisor_commission_payments
FOR EACH ROW EXECUTE FUNCTION update_commission_totals();

-- =============================================
-- RLS POLICIES (enable after auth setup)
-- =============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (single admin app)
CREATE POLICY "Authenticated full access" ON projects
  FOR ALL USING (auth.role() = 'authenticated');
-- Repeat same policy for all tables above