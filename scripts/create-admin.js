require("dotenv").config();
const { Client } = require("pg");

async function createAdminUser() {
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

        const email = 'admin@crm.com';
        const password = '123';

        // Check if user exists
        let res = await client.query(`SELECT id FROM auth.users WHERE email = $1`, [email]);
        let userId;

        if (res.rows.length === 0) {
            console.log("Setting up new auth.user...");
            const insertUser = await client.query(`
                INSERT INTO auth.users (
                    instance_id,
                    id,
                    aud,
                    role,
                    email,
                    encrypted_password,
                    email_confirmed_at,
                    recovery_sent_at,
                    last_sign_in_at,
                    raw_app_meta_data,
                    raw_user_meta_data,
                    created_at,
                    updated_at,
                    confirmation_token,
                    email_change,
                    email_change_token_new,
                    recovery_token
                ) VALUES (
                    '00000000-0000-0000-0000-000000000000',
                    gen_random_uuid(),
                    'authenticated',
                    'authenticated',
                    $1,
                    crypt($2, gen_salt('bf')),
                    timezone('utc'::text, now()),
                    NULL,
                    NULL,
                    '{"provider": "email", "providers": ["email"]}',
                    '{"name": "System Admin", "role": "admin"}',
                    timezone('utc'::text, now()),
                    timezone('utc'::text, now()),
                    '',
                    '',
                    '',
                    ''
                ) RETURNING id;
            `, [email, password]);

            userId = insertUser.rows[0].id;

            // Generate identity
            await client.query(`
                INSERT INTO auth.identities (
                    id,
                    user_id,
                    identity_data,
                    provider,
                    last_sign_in_at,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    $1,
                    format('{"sub":"%s","email":"%s"}', $1::text, $2::text)::jsonb,
                    'email',
                    timezone('utc'::text, now()),
                    timezone('utc'::text, now()),
                    timezone('utc'::text, now())
                )
            `, [userId, email]);
            console.log("Created auth.users record: " + userId);
        } else {
            userId = res.rows[0].id;
            console.log("User already exists in auth.users: " + userId);
            // Updating password and meta data
            await client.query(`UPDATE auth.users SET encrypted_password = crypt($2, gen_salt('bf')), raw_user_meta_data = '{"name": "System Admin", "role": "admin"}' WHERE id = $1`, [userId, password]);
            console.log("Updated password.");
        }

        // Also insert into public.advisors table
        let advisorRes = await client.query(`SELECT id FROM public.advisors WHERE auth_user_id = $1`, [userId]);
        if (advisorRes.rows.length === 0) {
            await client.query(`
                INSERT INTO public.advisors (auth_user_id, email, name, code, phone, is_active)
                VALUES ($1, $2, 'System Admin', 'ADMIN-01', '9999999999', true)
            `, [userId, email]);
            console.log("Inserted into public.advisors");
        } else {
            console.log("Already an advisor.");
        }

        console.log("Admin setup complete!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

createAdminUser();
