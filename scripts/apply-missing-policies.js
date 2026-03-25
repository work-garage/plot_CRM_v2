require("dotenv").config();
const { Client } = require("pg");

async function applyPolicies() {
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
		connectionTimeoutMillis: 5000,
	});

	try {
        await client.connect();
        
        console.log("Applying Authenticated full access to advisors...");
        
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'advisors' AND policyname = 'Authenticated full access'
                ) THEN
                    CREATE POLICY "Authenticated full access" ON advisors
                    FOR ALL USING (auth.role() = 'authenticated');
                END IF;
            END
            $$;
        `);
        
        console.log("Policy applied to advisors.");

        // Just in case, apply to other essential tables that might be missing them
        const tables = [
            'plots', 'plot_sales', 'payments', 'advisor_commissions', 
            'advisor_commission_payments', 'office_expenses', 
            'customer_documents', 'staff', 'staff_attendance', 'reminders'
        ];
        
        for (const table of tables) {
            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'Authenticated full access'
                    ) THEN
                        CREATE POLICY "Authenticated full access" ON ${table}
                        FOR ALL USING (auth.role() = 'authenticated');
                    END IF;
                END
                $$;
            `);
            console.log("Policy applied to " + table);
        }
        
        console.log("All missing policies applied successfully.");
	} catch (err) {
		console.error("Error:", err.message);
	} finally {
		await client.end();
	}
}

applyPolicies();
