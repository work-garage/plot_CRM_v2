-- Migration: Fix schema mismatches for MG Infra CRM
-- Run this against your Supabase project

-- =============================================
-- 1. Add missing columns to projects
-- =============================================
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS min_plot_rate DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starting_plot_number INT DEFAULT 1;

-- =============================================
-- 2. Extend sale_phase enum (add app values)
-- App uses: token, agreement, registry, full_payment
-- =============================================
ALTER TYPE sale_phase ADD VALUE IF NOT EXISTS 'token';
ALTER TYPE sale_phase ADD VALUE IF NOT EXISTS 'agreement';
ALTER TYPE sale_phase ADD VALUE IF NOT EXISTS 'registry';
ALTER TYPE sale_phase ADD VALUE IF NOT EXISTS 'full_payment';

-- =============================================
-- 3. Create advisor_project_commissions table
-- =============================================
CREATE TABLE IF NOT EXISTS advisor_project_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  commission_token DECIMAL(5,2) DEFAULT 0,
  commission_agreement DECIMAL(5,2) DEFAULT 0,
  commission_registry DECIMAL(5,2) DEFAULT 0,
  commission_full_payment DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, advisor_id)
);

CREATE INDEX IF NOT EXISTS idx_advisor_project_commissions_project 
  ON advisor_project_commissions(project_id);
CREATE INDEX IF NOT EXISTS idx_advisor_project_commissions_advisor 
  ON advisor_project_commissions(advisor_id);

ALTER TABLE advisor_project_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON advisor_project_commissions
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 4. Add advisor login support
-- auth_user_id links to Supabase auth.users
-- =============================================
ALTER TABLE advisors 
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_advisors_auth_user_id 
  ON advisors(auth_user_id) WHERE auth_user_id IS NOT NULL;
