import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function run() {
    const connectionString = "postgres://postgres.ycdwmdntkixmddkttbna:L%26c117B1B62bB21@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to DB!');

        const sql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20260325000000_custom_crm_update.sql'), 'utf-8');
        
        console.log('Applying CRM update migration...');
        await client.query(sql);

        console.log('Successfully applied CRM migration!');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

run();
