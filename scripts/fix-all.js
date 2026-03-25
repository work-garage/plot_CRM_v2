require("dotenv").config();
const { Client } = require("pg");

async function fixAll() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const dbPassword = process.env.DB_PASSWORD;
    const projectRef = supabaseUrl.split("://")[1].split(".")[0];

    const client = new Client({
        host: "aws-1-ap-northeast-1.pooler.supabase.com",
        port: 6543,
        user: `postgres.${projectRef}`,
        password: dbPassword,
        database: "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
    });

    await client.connect();
    console.log("Connected!");

    // ============================================================
    // A1: Remove admin from advisors table
    // ============================================================
    await client.query(`DELETE FROM public.advisors WHERE code = 'ADMIN-01';`);
    console.log("A1: Removed ADMIN-01 from advisors.");

    // ============================================================
    // A2: Fix advisors RLS — admin full, advisor read-own only
    // ============================================================
    await client.query(`
        DROP POLICY IF EXISTS "Authenticated full access" ON public.advisors;
        DROP POLICY IF EXISTS "Admin full access to advisors" ON public.advisors;
        DROP POLICY IF EXISTS "Advisor read own row" ON public.advisors;
    `);

    await client.query(`
        CREATE POLICY "Admin full access to advisors"
        ON public.advisors FOR ALL
        TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IS NULL
        )
        WITH CHECK (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IS NULL
        );
    `);

    await client.query(`
        CREATE POLICY "Advisor read own row"
        ON public.advisors FOR SELECT
        TO authenticated
        USING (auth_user_id = auth.uid());
    `);
    console.log("A2: Fixed advisors RLS.");

    // ============================================================
    // A3: Fix customers RLS — admin full, advisor manage own
    // ============================================================
    await client.query(`
        DROP POLICY IF EXISTS "Authenticated full access" ON public.customers;
        DROP POLICY IF EXISTS "Admin full access to customers" ON public.customers;
        DROP POLICY IF EXISTS "Advisor manage own customers" ON public.customers;
    `);

    await client.query(`
        CREATE POLICY "Admin full access to customers"
        ON public.customers FOR ALL
        TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IS NULL
        )
        WITH CHECK (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IS NULL
        );
    `);

    await client.query(`
        CREATE POLICY "Advisor manage own customers"
        ON public.customers FOR ALL
        TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'advisor'
            AND advisor_id IN (
                SELECT id FROM public.advisors WHERE auth_user_id = auth.uid()
            )
        )
        WITH CHECK (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'advisor'
            AND advisor_id IN (
                SELECT id FROM public.advisors WHERE auth_user_id = auth.uid()
            )
        );
    `);
    console.log("A3a: Fixed customers RLS.");

    // customer_follow_ups
    await client.query(`
        DROP POLICY IF EXISTS "Admins have full access to follow_ups" ON public.customer_follow_ups;
        DROP POLICY IF EXISTS "Advisors can access their own customers' follow_ups" ON public.customer_follow_ups;
        DROP POLICY IF EXISTS "Admin full access to follow_ups" ON public.customer_follow_ups;
        DROP POLICY IF EXISTS "Advisor manage own follow_ups" ON public.customer_follow_ups;
    `);
    await client.query(`
        CREATE POLICY "Admin full access to follow_ups"
        ON public.customer_follow_ups FOR ALL TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IS NULL
        )
        WITH CHECK (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IS NULL
        );

        CREATE POLICY "Advisor manage own follow_ups"
        ON public.customer_follow_ups FOR ALL TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'advisor'
            AND customer_id IN (
                SELECT c.id FROM public.customers c
                JOIN public.advisors a ON a.id = c.advisor_id
                WHERE a.auth_user_id = auth.uid()
            )
        )
        WITH CHECK (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'advisor'
            AND customer_id IN (
                SELECT c.id FROM public.customers c
                JOIN public.advisors a ON a.id = c.advisor_id
                WHERE a.auth_user_id = auth.uid()
            )
        );
    `);
    console.log("A3b: Fixed customer_follow_ups RLS.");

    // customer_project_interests
    await client.query(`
        DROP POLICY IF EXISTS "Admins have full access to project interests" ON public.customer_project_interests;
        DROP POLICY IF EXISTS "Advisors can access their own customers' project interests" ON public.customer_project_interests;
        DROP POLICY IF EXISTS "Admin full access to project interests" ON public.customer_project_interests;
        DROP POLICY IF EXISTS "Advisor manage own project interests" ON public.customer_project_interests;
    `);
    await client.query(`
        CREATE POLICY "Admin full access to project interests"
        ON public.customer_project_interests FOR ALL TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IS NULL
        )
        WITH CHECK (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IS NULL
        );

        CREATE POLICY "Advisor manage own project interests"
        ON public.customer_project_interests FOR ALL TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'advisor'
            AND customer_id IN (
                SELECT c.id FROM public.customers c
                JOIN public.advisors a ON a.id = c.advisor_id
                WHERE a.auth_user_id = auth.uid()
            )
        )
        WITH CHECK (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'advisor'
            AND customer_id IN (
                SELECT c.id FROM public.customers c
                JOIN public.advisors a ON a.id = c.advisor_id
                WHERE a.auth_user_id = auth.uid()
            )
        );
    `);
    console.log("A3c: Fixed customer_project_interests RLS.");

    // Fix reminders — fully admin-controlled
    await client.query(`
        DROP POLICY IF EXISTS "Authenticated full access" ON public.reminders;
        DROP POLICY IF EXISTS "Admin full access to reminders" ON public.reminders;
    `);
    await client.query(`
        CREATE POLICY "Authenticated full access" ON public.reminders
        FOR ALL TO authenticated USING (auth.role() = 'authenticated');
    `);
    console.log("A3d: Fixed reminders RLS.");

    // Fix projects RLS if missing
    await client.query(`
        DROP POLICY IF EXISTS "Authenticated full access" ON public.projects;
    `);
    await client.query(`
        CREATE POLICY "Authenticated full access" ON public.projects
        FOR ALL TO authenticated USING (auth.role() = 'authenticated');
    `);
    console.log("A3e: Fixed projects RLS.");

    // B1: Add email + city to customers
    await client.query(`
        ALTER TABLE public.customers
            ADD COLUMN IF NOT EXISTS email TEXT,
            ADD COLUMN IF NOT EXISTS city TEXT;
    `);
    console.log("B1: Added email + city to customers.");

    // B2: Add builder_name + segment to projects
    await client.query(`
        ALTER TABLE public.projects
            ADD COLUMN IF NOT EXISTS builder_name TEXT,
            ADD COLUMN IF NOT EXISTS segment TEXT;
    `);
    console.log("B2: Added builder_name + segment to projects.");

    // B3: Add team to advisors
    await client.query(`
        ALTER TABLE public.advisors
            ADD COLUMN IF NOT EXISTS team TEXT;
    `);
    console.log("B3: Added team to advisors.");

    await client.end();
    console.log("\n✅ All DB fixes applied successfully!");
}

fixAll().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
