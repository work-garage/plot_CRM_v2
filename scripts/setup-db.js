require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function setupDatabase() {
	const supabaseUrl = process.env.SUPABASE_URL;
	const dbPassword = process.env.DB_PASSWORD;

	if (!supabaseUrl || !dbPassword || dbPassword === "YOUR_DB_PASSWORD_HERE") {
		console.error(
			"Error: Please provide SUPABASE_URL and DB_PASSWORD in your .env file."
		);
		process.exit(1);
	}

	const projectRef = supabaseUrl.split("://")[1].split(".")[0];

	// List of connection strategies to try
	const strategies = [
		{
			name: "User-provided Pooler (ap-northeast-1 aws-1)",
			host: "aws-1-ap-northeast-1.pooler.supabase.com",
			port: 6543,
			user: `postgres.${projectRef}`,
		},
		{
			name: "Direct Connection (IPv6)",
			host: `db.${projectRef}.supabase.co`,
			port: 5432,
			user: "postgres",
		},
		{
			name: "Pooler ap-northeast-1 (aws-0)",
			host: "aws-0-ap-northeast-1.pooler.supabase.com",
			port: 6543,
			user: `postgres.${projectRef}`,
		},
	];

	let client;
	let connected = false;

	for (const strategy of strategies) {
		console.log(`Attempting connection: ${strategy.name}...`);
		client = new Client({
			host: strategy.host,
			port: strategy.port,
			user: strategy.user,
			password: dbPassword,
			database: "postgres",
			ssl: { rejectUnauthorized: false },
			connectionTimeoutMillis: 5000,
		});

		try {
			await client.connect();
			connected = true;
			console.log(`Connected successfully via ${strategy.name}!`);
			break;
		} catch (err) {
			console.warn(`${strategy.name} failed: ${err.message}`);
			await client.end();
		}
	}

	if (!connected) {
		console.error("\nCould not connect to the database.");
		process.exit(1);
	}

	try {
		const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
		console.log(`Reading schema from ${schemaPath}...`);
		const sql = fs.readFileSync(schemaPath, "utf8");

		console.log("Executing SQL schema...");
		// We split by semicolon to handle large schemas better, but pg can handle some multi-statements
		// However, for schema.sql with many triggers/functions, it's safer to run as one block or split carefully.
		// For this schema, running as one block is usually fine if there are no 'GO' or similar non-standard separators.
		await client.query(sql);
		console.log("Schema executed successfully!");
	} catch (err) {
		console.error("Error executing schema:", err.message);
	} finally {
		await client.end();
	}
}

setupDatabase();
