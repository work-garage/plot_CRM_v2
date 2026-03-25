"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
	advisorSchema,
	type AdvisorFormValues,
} from "@/lib/validations/advisor";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

function getNextBirthdayDate(birthDate: string): string | null {
	if (!birthDate) return null;
	const parsed = new Date(birthDate);
	if (Number.isNaN(parsed.getTime())) return null;
	const today = new Date();
	const month = parsed.getMonth();
	const day = parsed.getDate();
	let target = new Date(today.getFullYear(), month, day);
	target.setHours(0, 0, 0, 0);
	const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	if (target < now) target = new Date(today.getFullYear() + 1, month, day);
	return target.toISOString().slice(0, 10);
}

async function syncAdvisorBirthdayReminder(
	supabase: any,
	advisor: { id: string; name: string; phone: string; birth_date?: string | null },
) {
	const marker = `AUTO_BIRTHDAY:advisor:${advisor.id}`;
	const { data: existing } = await supabase
		.from("reminders")
		.select("id")
		.eq("description", marker)
		.maybeSingle();

	const nextDate = advisor.birth_date ? getNextBirthdayDate(advisor.birth_date) : null;
	if (!nextDate) {
		if (existing?.id) {
			await supabase.from("reminders").delete().eq("id", existing.id);
		}
		return;
	}

	const payload = {
		title: `Birthday Wish - ${advisor.name}`,
		type: "birthday_advisor",
		phone: advisor.phone || null,
		description: marker,
		reminder_date: nextDate,
		reminder_time: "09:00",
		customer_id: null,
		project_id: null,
		is_completed: false,
	};

	if (existing?.id) {
		await supabase.from("reminders").update(payload).eq("id", existing.id);
	} else {
		await supabase.from("reminders").insert(payload);
	}
}

function toAdvisorEmail(phone: string): string {
	const sanitized = phone.replace(/\D/g, "").slice(-10) || "0";
	return `adv_${sanitized}@mginfra.local`;
}

export async function createAdvisor(
	values: AdvisorFormValues
): Promise<ActionResponse> {
	const parsed = advisorSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const advisorEmail = parsed.data.email?.trim() || toAdvisorEmail(parsed.data.phone);
	const password =
		parsed.data.use_phone_as_password || !parsed.data.password?.trim()
			? parsed.data.phone.replace(/\D/g, "").slice(-10) || parsed.data.phone
			: parsed.data.password;

	const { data: advisor, error } = await supabase
		.from("advisors")
		.insert({
			name: parsed.data.name,
			code: parsed.data.code,
			phone: parsed.data.phone,
			email: advisorEmail,
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
		})
		.select("id")
		.single();

	if (error) {
		const msg = (error.message || "").toLowerCase();
		// Supabase/PostgREST schema cache error when DB migration not applied yet
		if (msg.includes("schema cache") && msg.includes("email")) {
			return {
				success: false,
				error:
					"Database is missing `advisors.email` (or schema cache not refreshed). " +
					"Run the migration in Supabase SQL Editor, then retry.\n\n" +
					"SQL:\n" +
					"ALTER TABLE advisors ADD COLUMN IF NOT EXISTS email TEXT;\n" +
					"ALTER TABLE advisors ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;\n",
			};
		}
		if (error.code === "23505") {
			return { success: false, error: "Advisor code already exists" };
		}
		return { success: false, error: error.message };
	}

	if (advisor?.id) {
		await syncAdvisorBirthdayReminder(supabase, {
			id: advisor.id,
			name: parsed.data.name,
			phone: parsed.data.phone,
			birth_date: parsed.data.birth_date ?? null,
		});
	}

	// Create Supabase Auth user for advisor login (requires SUPABASE_SERVICE_ROLE_KEY)
	const admin = createAdminClient();
	if (admin && advisor?.id) {
		const pw = password.length >= 6 ? password : String(password).padEnd(6, "0");
		const { data: authUser, error: authError } = await admin.auth.admin.createUser({
			email: advisorEmail,
			password: pw,
			email_confirm: true,
			user_metadata: { role: "advisor", advisor_id: advisor.id },
		});
		if (!authError && authUser?.user) {
			await supabase
				.from("advisors")
				.update({ auth_user_id: authUser.user.id, email: advisorEmail })
				.eq("id", advisor.id);
		}
	}

	revalidatePath("/advisors");
	revalidatePath("/messaging");
	return { success: true };
}

export async function updateAdvisor(
	id: string,
	values: AdvisorFormValues
): Promise<ActionResponse> {
	const parsed = advisorSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: updatedAdvisor, error } = await supabase
		.from("advisors")
		.update({
			name: parsed.data.name,
			code: parsed.data.code,
			phone: parsed.data.phone,
			// Always keep email populated for advisor login (auto-generate if blank).
			email: parsed.data.email?.trim()
				? parsed.data.email.trim()
				: toAdvisorEmail(parsed.data.phone),
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		.select("id, name, phone, birth_date")
		.single();

	if (error) {
		const msg = (error.message || "").toLowerCase();
		if (msg.includes("schema cache") && msg.includes("email")) {
			return {
				success: false,
				error:
					"Database is missing `advisors.email` (or schema cache not refreshed). " +
					"Run the migration in Supabase SQL Editor, then retry.\n\n" +
					"SQL:\n" +
					"ALTER TABLE advisors ADD COLUMN IF NOT EXISTS email TEXT;\n" +
					"ALTER TABLE advisors ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;\n",
			};
		}
		return { success: false, error: error.message };
	}

	if (updatedAdvisor?.id) {
		await syncAdvisorBirthdayReminder(supabase, updatedAdvisor);
	}

	revalidatePath("/advisors");
	revalidatePath(`/advisors/${id}`);
	revalidatePath("/messaging");
	return { success: true };
}

export async function getAdvisors() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("advisors")
		.select("*")
		.order("name", { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
}

export async function getAdvisorById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("advisors")
		.select("*")
		.eq("id", id)
		.single();

	if (error) return null;
	return data;
}

export type AdvisorAnalytics = {
	advisor: NonNullable<Awaited<ReturnType<typeof getAdvisorById>>>;
	salesCount: number;
	totalRevenue: number;
	totalCommission: number;
	commissionPaid: number;
	commissionPending: number;
	sales: Array<{
		id: string;
		plot_number: string;
		project_name: string;
		customer_name: string;
		total_sale_amount: number;
		amount_paid: number;
		remaining_amount: number;
		sale_phase: string;
		token_date: string | null;
	}>;
	commissions: Array<{
		id: string;
		plot_number: string;
		total_commission_amount: number;
		amount_paid: number;
		remaining_commission: number;
	}>;
};

export async function getAdvisorAnalytics(
	advisorId: string
): Promise<AdvisorAnalytics | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	const advisor = await getAdvisorById(advisorId);
	if (!advisor) return null;

	const { data: sales } = await supabase
		.from("plot_sales")
		.select(
			`
      id,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      sale_phase,
      token_date,
      plots(plot_number, projects(name)),
      customers(name)
    `
		)
		.eq("advisor_id", advisorId)
		.eq("is_cancelled", false)
		.order("created_at", { ascending: false });

	const { data: commissions } = await supabase
		.from("advisor_commissions")
		.select(
			`
      id,
      total_commission_amount,
      amount_paid,
      remaining_commission,
      plot_sales(
        total_sale_amount,
        amount_paid,
        plots(plot_number, size_sqft, rate_per_sqft)
      )
    `
		)
		.eq("advisor_id", advisorId)
		.order("created_at", { ascending: false });

	const salesList = (sales ?? []).map((s: any) => ({
		id: s.id,
		plot_number: s.plots?.plot_number ?? "—",
		project_name: s.plots?.projects?.name ?? "—",
		customer_name: s.customers?.name ?? "—",
		total_sale_amount: Number(s.total_sale_amount ?? 0),
		amount_paid: Number(s.amount_paid ?? 0),
		remaining_amount: Number(s.remaining_amount ?? 0),
		sale_phase: s.sale_phase ?? "—",
		token_date: s.token_date,
	}));

	const commList = (commissions ?? []).map((c: any) => {
		const saleTotal = Number(c.plot_sales?.total_sale_amount ?? 0);
		const saleReceived = Number(c.plot_sales?.amount_paid ?? 0);
		const plotSize = Number(c.plot_sales?.plots?.size_sqft ?? 0);
		const baseRate = Number(c.plot_sales?.plots?.rate_per_sqft ?? 0);
		const profitMax = Math.max(0, saleTotal - plotSize * baseRate);
		const ratio = saleTotal > 0 ? Math.min(1, Math.max(0, saleReceived / saleTotal)) : 0;
		const eligibleNow = profitMax * ratio;
		const paid = Number(c.amount_paid ?? 0);
		const pendingNow = Math.max(0, eligibleNow - paid);

		return {
		id: c.id,
		plot_number: c.plot_sales?.plots?.plot_number ?? "—",
		// Expose profit-based numbers in the same fields for compatibility
		total_commission_amount: Number(profitMax ?? 0),
		amount_paid: paid,
		remaining_commission: pendingNow,
		};
	});

	const salesCount = salesList.length;
	const totalRevenue = salesList.reduce((s, x) => s + x.total_sale_amount, 0);
	const totalCommission = commList.reduce((s, x) => s + x.total_commission_amount, 0);
	const commissionPaid = commList.reduce((s, x) => s + x.amount_paid, 0);
	const commissionPending = commList.reduce((s, x) => s + x.remaining_commission, 0);

	return {
		advisor,
		salesCount,
		totalRevenue,
		totalCommission,
		commissionPaid,
		commissionPending,
		sales: salesList,
		commissions: commList,
	};
}
