require("dotenv").config();
const { Client } = require("pg");

async function checkTables() {
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
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        console.log("Tables:", res.rows.map(r => r.table_name).join(", "));
        
        const cols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'advisors';
        `);
        console.log("Advisor Cols:", cols.rows.map(r => r.column_name + " " + r.data_type).join(", "));
	} catch (err) {
		console.error("Error:", err.message);
	} finally {
		await client.end();
	}
}

checkTables();
