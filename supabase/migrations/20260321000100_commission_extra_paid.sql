-- Track extra payouts made beyond currently eligible advisor commission.
ALTER TABLE advisor_commission_payments
ADD COLUMN IF NOT EXISTS extra_paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Helpful for dashboard/report aggregations.
CREATE INDEX IF NOT EXISTS idx_advisor_commission_payments_paid_date
ON advisor_commission_payments (paid_date);
