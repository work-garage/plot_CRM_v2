-- EMI, Admin Direct Sell, Receipts migration

-- Note: Create "receipts" bucket in Supabase Dashboard (Storage) if needed; set public=true for share links.
-- Makes advisor_id nullable for admin direct sell
-- Adds sale_id to reminders for EMI linkage
-- Adds followup_date and receipt_path to plot_sales
-- Adds sold_by_admin flag

-- Make advisor_id nullable for admin direct sell
ALTER TABLE plot_sales ALTER COLUMN advisor_id DROP NOT NULL;

-- Add sale_id to reminders for EMI linkage
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES plot_sales(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_sale ON reminders(sale_id);

-- Add followup_date to plot_sales (for first follow-up)
ALTER TABLE plot_sales ADD COLUMN IF NOT EXISTS followup_date DATE;

-- Add receipt_path to plot_sales for generated sale receipts
ALTER TABLE plot_sales ADD COLUMN IF NOT EXISTS receipt_path TEXT;

-- sold_by_admin for explicit flag (advisor_id IS NULL also indicates admin)
ALTER TABLE plot_sales ADD COLUMN IF NOT EXISTS sold_by_admin BOOLEAN DEFAULT false;
