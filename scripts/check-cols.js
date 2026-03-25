import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'customers';").then(r => {
  console.log(r.rows.map(x => x.column_name).join(", "));
  pool.end();
});
