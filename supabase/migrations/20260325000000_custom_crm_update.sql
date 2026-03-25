-- 1. Alter customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS segment TEXT,
  ADD COLUMN IF NOT EXISTS budget_min NUMERIC,
  ADD COLUMN IF NOT EXISTS budget_max NUMERIC,
  ADD COLUMN IF NOT EXISTS preferred_location TEXT,
  ADD COLUMN IF NOT EXISTS bhk_size TEXT,
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'New Lead';

-- 2. Create customer_follow_ups table
CREATE TABLE IF NOT EXISTS public.customer_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  follow_up_date TIMESTAMPTZ,
  next_follow_up_date TIMESTAMPTZ,
  whatsapp_done BOOLEAN NOT NULL DEFAULT false,
  call_done BOOLEAN NOT NULL DEFAULT false,
  site_visit_done BOOLEAN NOT NULL DEFAULT false,
  customer_mood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_follow_ups_customer ON public.customer_follow_ups(customer_id);

ALTER TABLE public.customer_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on follow_ups" ON public.customer_follow_ups
  FOR ALL USING (
    lower(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), ''))) IN ('admin', 'superadmin', 'owner')
    OR nullif(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '')), '') IS NULL
  );

CREATE POLICY "Advisor access own customer follow_ups" ON public.customer_follow_ups
  FOR ALL USING (
    lower(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), ''))) = 'advisor'
    AND customer_id IN (
      SELECT id FROM public.customers
      WHERE advisor_id = (
        CASE
          WHEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          ELSE NULL
        END
      )
    )
  );

-- 3. Create customer_project_interests table
CREATE TABLE IF NOT EXISTS public.customer_project_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_project_interests_customer ON public.customer_project_interests(customer_id);

ALTER TABLE public.customer_project_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on project_interests" ON public.customer_project_interests
  FOR ALL USING (
    lower(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), ''))) IN ('admin', 'superadmin', 'owner')
    OR nullif(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '')), '') IS NULL
  );

CREATE POLICY "Advisor access own customer project_interests" ON public.customer_project_interests
  FOR ALL USING (
    lower(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), ''))) = 'advisor'
    AND customer_id IN (
      SELECT id FROM public.customers
      WHERE advisor_id = (
        CASE
          WHEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          ELSE NULL
        END
      )
    )
  );
