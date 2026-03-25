-- Expenses/Reminders project linkage + dynamic layout expense calculation

-- 1) Extend expense categories (safe, idempotent)
DO $$
BEGIN
  BEGIN
    ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'office';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'travel';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'layout_dev';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'legal';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 2) Link office expenses to a project (optional)
ALTER TABLE office_expenses
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_office_expenses_project ON office_expenses(project_id);

-- 3) Link reminders to a project (optional)
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_project ON reminders(project_id);

-- 4) Dynamically maintain projects.layout_expense from plots:
-- sum(size_sqft * min_plot_rate) where size_sqft > 0
CREATE OR REPLACE FUNCTION recalc_project_layout_expense(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE projects p
  SET layout_expense = COALESCE((
    SELECT SUM(COALESCE(pl.size_sqft, 0) * COALESCE(p.min_plot_rate, 0))
    FROM plots pl
    WHERE pl.project_id = p.id
      AND COALESCE(pl.size_sqft, 0) > 0
  ), 0),
  updated_at = now()
  WHERE p.id = p_project_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_recalc_project_layout_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_project_layout_expense(OLD.project_id);
    RETURN OLD;
  END IF;

  PERFORM recalc_project_layout_expense(NEW.project_id);

  IF TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    PERFORM recalc_project_layout_expense(OLD.project_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_layout_expense_on_plots ON plots;
CREATE TRIGGER trigger_recalc_layout_expense_on_plots
AFTER INSERT OR UPDATE OR DELETE ON plots
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_project_layout_expense();

-- Recompute current data once
UPDATE projects p
SET layout_expense = COALESCE((
  SELECT SUM(COALESCE(pl.size_sqft, 0) * COALESCE(p.min_plot_rate, 0))
  FROM plots pl
  WHERE pl.project_id = p.id
    AND COALESCE(pl.size_sqft, 0) > 0
), 0),
updated_at = now();
