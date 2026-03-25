require("dotenv").config();
const { Client } = require("pg");

async function checkRLSAll() {
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
        
        let res = await client.query(`
            SELECT relname, relrowsecurity 
            FROM pg_class 
            WHERE relname = 'advisors';
        `);
        console.log("RLS enabled status:", res.rows);

        let pols = await client.query(`
            SELECT tablename, policyname
            FROM pg_policies
            WHERE tablename = 'advisors';
        `);
        console.log("Policies:", pols.rows);
	} catch (err) {
		console.error("Error:", err.message);
	} finally {
		await client.end();
	}
}

checkRLSAll();
