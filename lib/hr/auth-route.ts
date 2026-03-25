import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

/**
 * Admin check for HR API routes — aligned with `middleware.ts`:
 * - Advisors (`user_metadata.role === "advisor"`) are NOT admins.
 * - Everyone else who can use the main dashboard is treated as admin here, including
 *   users with **no `role` in metadata** (common for email/password admin signups).
 * - Explicit roles `admin` | `superadmin` | `owner` also count.
 */
export function isAdminUser(user: User | null): boolean {
	if (!user) return false;
	const md = user.user_metadata as Record<string, unknown>;
	const ad = user.app_metadata as Record<string, unknown>;
	const raw =
		md?.role ??
		md?.user_role ??
		md?.userRole ??
		ad?.role ??
		ad?.user_role ??
		"";
	const r = String(raw).trim().toLowerCase();
	if (r === "advisor") return false;
	if (r === "admin" || r === "superadmin" || r === "owner") return true;
	// No role set → same as middleware: not an advisor, so dashboard/admin app user
	if (!r) return true;
	return false;
}

export async function requireAdmin() {
	const supabase = await createClient();
	if (!supabase) {
		return { error: NextResponse.json({ error: "Database unavailable" }, { status: 500 }) };
	}
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
	}
	if (!isAdminUser(user)) {
		return {
			error: NextResponse.json(
				{
					error: "Forbidden",
					hint:
						"If you are an advisor, HR is admin-only. Otherwise set user_metadata.role to 'admin' in Supabase Auth, or run scripts/supabase-check-admin-role.sql.",
				},
				{ status: 403 }
			),
		};
	}
	return { supabase, user };
}
