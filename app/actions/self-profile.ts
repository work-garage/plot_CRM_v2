"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SelfProfile =
	| {
			role: "advisor";
			advisor: {
				id: string;
				name: string;
				phone: string;
				address: string | null;
				birth_date: string | null;
				notes: string | null;
				is_active: boolean;
			};
	  }
	| {
			role: "admin";
			admin: {
				id: string;
				name: string | null;
				email: string | null;
			};
	  };

const advisorSelfSchema = z.object({
	name: z.string().min(2, "Name is required"),
	phone: z
		.string()
		.regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
	address: z.string().optional().default(""),
	birth_date: z.string().optional().nullable(),
	notes: z.string().optional().default(""),
	is_active: z.boolean().optional().default(true),
});

const adminSelfSchema = z.object({
	name: z.string().min(2, "Name is required"),
});

export async function getSelfProfile(): Promise<SelfProfile | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) return null;

	const meta = (user.user_metadata as any) || {};
	const role = (meta.role as "advisor" | "admin" | undefined) || "admin";

	if (role === "advisor") {
		const advisorId = meta.advisor_id as string | undefined;
		if (!advisorId) return null;

		const { data, error } = await supabase
			.from("advisors")
			.select("id,name,phone,address,birth_date,notes,is_active")
			.eq("id", advisorId)
			.single();

		if (error || !data) return null;

		return {
			role: "advisor",
			advisor: {
				id: data.id,
				name: data.name,
				phone: data.phone,
				address: data.address,
				birth_date: data.birth_date,
				notes: data.notes,
				is_active: data.is_active,
			},
		};
	}

	const name =
		(meta.name as string | undefined) ||
		(meta.full_name as string | undefined) ||
		(meta.fullName as string | undefined) ||
		null;

	return {
		role: "admin",
		admin: {
			id: user.id,
			name,
			email: user.email ?? null,
		},
	};
}

export async function updateSelfProfile(values: any) {
	const supabase = await createClient();
	if (!supabase) return { success: false as const, error: "Unauthorized" };

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) {
		return { success: false as const, error: "Unauthorized" };
	}

	const meta = (user.user_metadata as any) || {};
	const role = (meta.role as "advisor" | "admin" | undefined) || "admin";

	try {
		if (role === "advisor") {
			const advisorId = meta.advisor_id as string | undefined;
			if (!advisorId) return { success: false as const, error: "Advisor context missing" };

			const parsed = advisorSelfSchema.safeParse(values);
			if (!parsed.success) {
				return {
					success: false as const,
					error: parsed.error.issues[0]?.message || "Validation failed",
				};
			}

			const { error } = await supabase
				.from("advisors")
				.update({
					name: parsed.data.name,
					phone: parsed.data.phone,
					address: parsed.data.address || null,
					birth_date: parsed.data.birth_date || null,
					notes: parsed.data.notes || null,
					is_active: parsed.data.is_active,
					updated_at: new Date().toISOString(),
				})
				.eq("id", advisorId);

			if (error) return { success: false as const, error: error.message };
			return { success: true as const };
		}

		// Admin: update auth user metadata "name"
		const parsed = adminSelfSchema.safeParse(values);
		if (!parsed.success) {
			return {
				success: false as const,
				error: parsed.error.issues[0]?.message || "Validation failed",
			};
		}

		const admin = createAdminClient();
		if (!admin) return { success: false as const, error: "Admin client unavailable" };

		const existingMeta = (user.user_metadata as any) || {};
		const { error } = await admin.auth.admin.updateUserById(user.id, {
			user_metadata: {
				...existingMeta,
				name: parsed.data.name,
			},
		});

		if (error) return { success: false as const, error: error.message };
		return { success: true as const };
	} catch (e: any) {
		return { success: false as const, error: e?.message || String(e) };
	}
}

