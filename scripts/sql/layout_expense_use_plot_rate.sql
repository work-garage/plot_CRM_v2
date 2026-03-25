-- Optional Supabase / Postgres maintenance
-- After moving base rate from projects.min_plot_rate to plots.rate_per_sqft, update the
-- layout_expense trigger (if migration 20250320000010 was applied) so DB stays in sync
-- with app logic in app/actions/project-actions.ts (recalcLayoutExpenseForProject).

CREATE OR REPLACE FUNCTION recalc_project_layout_expense(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE projects p
  SET layout_expense = COALESCE((
    SELECT SUM(COALESCE(pl.size_sqft, 0) * COALESCE(pl.rate_per_sqft, 0))
    FROM plots pl
    WHERE pl.project_id = p_project_id
      AND COALESCE(pl.size_sqft, 0) > 0
      AND COALESCE(pl.rate_per_sqft, 0) > 0
  ), 0),
  updated_at = NOW()
  WHERE p.id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Backfill all projects (optional; run once)
-- UPDATE triggers already fire on plot changes; this catches historical drift.
-- SELECT recalc_project_layout_expense(id) FROM projects;

-- To drop legacy column (only after all code/queries use plot rates):
-- ALTER TABLE projects DROP COLUMN IF EXISTS min_plot_rate;
