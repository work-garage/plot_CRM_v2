"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export type AuthResult = { success: boolean; error?: string };

function toAdvisorEmail(phone: string): string {
	const sanitized = phone.replace(/\D/g, "").slice(-10) || "0";
	return `adv_${sanitized}@mginfra.local`;
}

export async function signInWithEmailOrPhone(
	identifier: string,
	password: string
): Promise<AuthResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const id = (identifier || "").trim();
	if (!id) return { success: false, error: "Enter email or phone" };
	let email = id;
	const rawPassword = (password || "").trim();

	// If not an email, treat as phone and deterministically map advisor->email
	if (!id.includes("@")) {
		const digits = id.replace(/\D/g, "");
		const last10 = digits.slice(-10);
		if (!last10 || last10.length < 10) {
			return { success: false, error: "Enter a valid 10-digit phone number" };
		}

		const effectivePassword = rawPassword.length ? rawPassword : last10;
		email = toAdvisorEmail(last10);

		// First attempt: sign-in using deterministic email.
		// This avoids needing SELECT access to `advisors` (RLS can block it).
		const { error: signInErr } = await supabase.auth.signInWithPassword({
			email,
			password: effectivePassword,
		});

		if (!signInErr) {
			redirect("/dashboard");
			return { success: true };
		}

		// Fallback: if sign-in failed, ensure auth user exists (admin auth).
		const admin = createAdminClient();
		if (!admin) {
			return { success: false, error: "Invalid credentials." };
		}

		// Try to find advisor record using admin privileges.
		const { data: advisors } = await admin
			.from("advisors")
			.select("id, email, phone, auth_user_id, is_active")
			.eq("is_active", true);

		const match = advisors?.find((a: any) => {
			const p = (a.phone || "").replace(/\D/g, "").slice(-10);
			return p === last10;
		});

		if (!match?.id) {
			return { success: false, error: "No advisor found for this phone." };
		}

		// Ensure email exists on advisor row.
		const resolvedEmail = (match.email || "").trim() || toAdvisorEmail(match.phone || last10);
		if (!match.email) {
			await admin.from("advisors").update({ email: resolvedEmail }).eq("id", match.id);
		}

		// Create auth user if missing.
		if (!match.auth_user_id) {
			const pw = effectivePassword.length >= 6 ? effectivePassword : effectivePassword.padEnd(6, "0");
			const { data: authUser, error: authError } = await admin.auth.admin.createUser({
				email: resolvedEmail,
				password: pw,
				email_confirm: true,
				user_metadata: { role: "advisor", advisor_id: match.id },
			});

			if (!authError && authUser?.user?.id) {
				await admin
					.from("advisors")
					.update({ auth_user_id: authUser.user.id, email: resolvedEmail })
					.eq("id", match.id);
			}
		}

		// Final attempt
		const { error: finalErr } = await supabase.auth.signInWithPassword({
			email: resolvedEmail,
			password: effectivePassword,
		});

		if (finalErr) return { success: false, error: "Invalid credentials." };
		redirect("/dashboard");
		return { success: true };
	}

	const { error } = await supabase.auth.signInWithPassword({
		email,
		password: (password || "").trim(),
	});

	if (error) {
		return { success: false, error: "Invalid credentials." };
	}

	redirect("/dashboard");
}
