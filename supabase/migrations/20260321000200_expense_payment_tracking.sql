-- Expense payment tracking: payment type + partial/full support
ALTER TABLE office_expenses
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash';

ALTER TABLE office_expenses
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;

UPDATE office_expenses
SET paid_amount = amount
WHERE paid_amount IS NULL OR paid_amount = 0;

ALTER TABLE office_expenses
ALTER COLUMN paid_amount SET NOT NULL;

ALTER TABLE office_expenses
ADD CONSTRAINT office_expenses_paid_amount_non_negative
CHECK (paid_amount >= 0);

ALTER TABLE office_expenses
ADD CONSTRAINT office_expenses_paid_amount_lte_amount
CHECK (paid_amount <= amount);
