require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function pushMigrations() {
	const supabaseUrl = process.env.SUPABASE_URL;
	const dbPassword = process.env.DB_PASSWORD;
	const projectRef = supabaseUrl.split("://")[1].split(".")[0];

	const strategies = [
		{
			name: "User-provided Pooler (ap-northeast-1 aws-1)",
			host: "aws-1-ap-northeast-1.pooler.supabase.com",
			port: 6543,
			user: `postgres.${projectRef}`,
		}
	];

	let client;
	let connected = false;

	for (const strategy of strategies) {
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

	if (!connected) process.exit(1);

	try {
        const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
        
        for(const file of files) {
            console.log(`Executing migration ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
            await client.query(sql);
            console.log(`Done ${file}`);
        }
		console.log("All migrations executed successfully!");
	} catch (err) {
		console.error("Error executing migrations:", err.message);
	} finally {
		await client.end();
	}
}

pushMigrations();
