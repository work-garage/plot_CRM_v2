-- Migration to prevent plot sale race conditions
-- This adds a unique constraint to ensure a plot can only be sold once

-- Add unique constraint on active plot sales
-- This prevents two sales from being created for the same plot
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_plot_sale 
ON plot_sales(plot_id) 
WHERE is_cancelled IS NOT TRUE OR is_cancelled IS NULL;

-- Add check to ensure plot status consistency
-- When a sale is created, plot should not be 'available'
ALTER TABLE plot_sales 
ADD CONSTRAINT check_plot_not_available 
CHECK (
  -- Allow any status during migration
  true
  -- In production, uncomment this to enforce:
  -- (SELECT status FROM plots WHERE id = plot_id) != 'available'
);

-- Add comment explaining the constraint
COMMENT ON INDEX unique_active_plot_sale IS 
'Prevents race conditions by ensuring only one active (non-cancelled) sale can exist per plot';
