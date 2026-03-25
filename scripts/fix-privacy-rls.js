require("dotenv").config({ path: ".env" });
const { Client } = require("pg");

async function fixPrivacyRLS() {
	const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const dbPassword = process.env.DB_PASSWORD;

	if (!supabaseUrl || !dbPassword) {
		console.error("Missing SUPABASE_URL or DB_PASSWORD");
		process.exit(1);
	}

	const projectRef = supabaseUrl.split("://")[1].split(".")[0];
	const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

	const client = new Client({
		connectionString,
		ssl: { rejectUnauthorized: false },
	});

	try {
		await client.connect();
		console.log("Connected to DB to fix RLS privacy...");

		const tables = ["customers", "plot_sales", "payments", "advisor_commissions", "customer_follow_ups"];
		
		for (const table of tables) {
			// Enable RLS just in case
			await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
			
			// Drop existing policies
			const result = await client.query(`
				SELECT policyname 
				FROM pg_policies 
				WHERE tablename = '${table}' AND schemaname = 'public';
			`);
			for (const row of result.rows) {
				console.log(`Dropping policy ${row.policyname} on ${table}`);
				await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON ${table};`);
			}
		}

		console.log("Applying strictly scoped Advisor policies...");

		// Customers
		await client.query(`
			CREATE POLICY "admin_and_advisor_access" ON customers FOR ALL TO authenticated
			USING (
				(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
				advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())
			);
		`);

		// Plot Sales
		await client.query(`
			CREATE POLICY "admin_and_advisor_access" ON plot_sales FOR ALL TO authenticated
			USING (
				(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
				advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())
			);
		`);

		// Advisor Commissions
		await client.query(`
			CREATE POLICY "admin_and_advisor_access" ON advisor_commissions FOR ALL TO authenticated
			USING (
				(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
				advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())
			);
		`);

		// Payments (via Plot Sales)
		await client.query(`
			CREATE POLICY "admin_and_advisor_access" ON payments FOR ALL TO authenticated
			USING (
				(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
				sale_id IN (
					SELECT id FROM plot_sales 
					WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())
				)
			);
		`);

		// Customer Follow Ups (via Customers)
		await client.query(`
			CREATE POLICY "admin_and_advisor_access" ON customer_follow_ups FOR ALL TO authenticated
			USING (
				(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
				customer_id IN (
					SELECT id FROM customers 
					WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())
				)
			);
		`);

		console.log("RLS Privacy Fixes Applied Successfully!");

	} catch (error) {
		console.error("Failed to fix RLS:", error);
	} finally {
		await client.end();
	}
}

fixPrivacyRLS();
