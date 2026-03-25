require("dotenv").config();
const { Client } = require("pg");

async function checkPolicies() {
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
        const res = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'advisors';
        `);
        console.log("Policies for advisors:", JSON.stringify(res.rows, null, 2));
	} catch (err) {
		console.error("Error:", err.message);
	} finally {
		await client.end();
	}
}

checkPolicies();
