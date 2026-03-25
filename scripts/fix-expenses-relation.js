import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE office_expenses 
      ADD CONSTRAINT office_expenses_project_id_fkey 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
    `);
    console.log("Success: Added foreign key constraint for office_expenses.project_id");
  } catch (err) {
    if (err.message.includes("already exists")) {
       console.log("Constraint already exists.");
    } else {
       console.error("Error:", err.message);
    }
  } finally {
    await pool.end();
  }
}

run();
