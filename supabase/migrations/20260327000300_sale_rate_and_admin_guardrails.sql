ALTER TABLE public.plot_sales
  ALTER COLUMN advisor_id DROP NOT NULL;

ALTER TABLE public.plot_sales
  ADD COLUMN IF NOT EXISTS advisor_rate_per_sqft numeric(12,2);

UPDATE public.plot_sales ps
SET advisor_rate_per_sqft = CASE
  WHEN coalesce(ps.sold_by_admin, false) THEN plots.rate_per_sqft
  WHEN coalesce(plots.size_sqft, 0) > 0 THEN round((ps.total_sale_amount / plots.size_sqft)::numeric, 2)
  ELSE NULL
END
FROM public.plots
WHERE plots.id = ps.plot_id
  AND ps.advisor_rate_per_sqft IS NULL;

UPDATE public.advisor_commissions ac
SET
  total_commission_amount = GREATEST(
    0,
    COALESCE(ps.total_sale_amount, 0) - COALESCE(plots.size_sqft, 0) * COALESCE(plots.rate_per_sqft, 0)
  ),
  remaining_commission = GREATEST(
    0,
    (
      GREATEST(
        0,
        COALESCE(ps.total_sale_amount, 0) - COALESCE(plots.size_sqft, 0) * COALESCE(plots.rate_per_sqft, 0)
      ) *
      CASE
        WHEN COALESCE(ps.total_sale_amount, 0) > 0
          THEN LEAST(1, GREATEST(0, COALESCE(ps.amount_paid, 0) / ps.total_sale_amount))
        ELSE 0
      END
    ) - COALESCE(ac.amount_paid, 0)
  )
FROM public.plot_sales ps
JOIN public.plots ON plots.id = ps.plot_id
WHERE ps.id = ac.sale_id;
