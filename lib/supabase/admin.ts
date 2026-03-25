import { createClient } from "@supabase/supabase-js";

/**
 * Admin client with service role key.
 * Use only in server-side code for privileged operations (e.g. creating auth users).
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export function createAdminClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) return null;
	return createClient(url, key);
}
