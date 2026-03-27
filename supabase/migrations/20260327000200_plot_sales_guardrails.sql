ALTER TABLE plot_sales
  ALTER COLUMN advisor_id DROP NOT NULL;

ALTER TABLE plot_sales
  DROP CONSTRAINT IF EXISTS plot_sales_total_sale_amount_check,
  DROP CONSTRAINT IF EXISTS plot_sales_down_payment_check,
  DROP CONSTRAINT IF EXISTS plot_sales_monthly_emi_check,
  DROP CONSTRAINT IF EXISTS plot_sales_emi_day_check,
  DROP CONSTRAINT IF EXISTS plot_sales_down_payment_lte_total_check;

ALTER TABLE plot_sales
  ADD CONSTRAINT plot_sales_total_sale_amount_check
    CHECK (total_sale_amount > 0),
  ADD CONSTRAINT plot_sales_down_payment_check
    CHECK (down_payment >= 0),
  ADD CONSTRAINT plot_sales_monthly_emi_check
    CHECK (monthly_emi IS NULL OR monthly_emi >= 0),
  ADD CONSTRAINT plot_sales_emi_day_check
    CHECK (emi_day IS NULL OR emi_day BETWEEN 1 AND 31),
  ADD CONSTRAINT plot_sales_down_payment_lte_total_check
    CHECK (down_payment <= total_sale_amount);
