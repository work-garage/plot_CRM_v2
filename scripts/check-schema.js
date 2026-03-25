require("dotenv").config();
const { Client } = require("pg");

async function checkSchema() {
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
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customers';
        `);
        console.log("Customer Columns:", res.rows.map(r => r.column_name).join(", "));
	} catch (err) {
		console.error("Error:", err.message);
	} finally {
		await client.end();
	}
}

checkSchema();
