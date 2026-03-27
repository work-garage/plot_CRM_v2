"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	reminderSchema,
	type ReminderFormValues,
} from "@/lib/validations/reminder";
import { getScopeContext } from "@/lib/server/scope";
import { LEAD_STATUS } from "@/lib/constants/lead-status";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

async function getAuthContext(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>) {
	const { user, role, advisorId } = await getScopeContext(supabase);
	return { user, role, advisorId: advisorId ?? undefined };
}

async function ensureAdvisorReminderAccess(
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
	userId: string,
	advisorId: string,
	customerId?: string | null,
	reminderId?: string,
) {
	if (customerId) {
		const { data: okCust } = await supabase
			.from("customers")
			.select("id")
			.eq("id", customerId)
			.eq("advisor_id", advisorId)
			.eq("is_active", true)
			.maybeSingle();
		return Boolean(okCust?.id);
	}

	if (!reminderId) return true;

	const { data: reminderRow } = await supabase
		.from("reminders")
		.select("id, created_by")
		.eq("id", reminderId)
		.maybeSingle();

	return reminderRow?.created_by === userId;
}

function revalidateReminderPaths() {
	revalidatePath("/messaging");
	revalidatePath("/advisor/messaging");
	revalidatePath("/dashboard");
	revalidatePath("/advisor");
}

export async function createReminder(
	values: ReminderFormValues
): Promise<ActionResponse> {
	const parsed = reminderSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) {
		return { success: false, error: "Database connection failed" };
	}

	const { user, role, advisorId } = await getAuthContext(supabase);
	if (!user) return { success: false, error: "Unauthorized" };

	if (role === "advisor") {
		if (!advisorId) {
			return { success: false, error: "Advisor context missing" };
		}
		const allowed = await ensureAdvisorReminderAccess(
			supabase,
			user.id,
			advisorId,
			parsed.data.customer_id || null,
		);
		if (!allowed) {
			return {
				success: false,
				error: "Not allowed to create reminders for this customer.",
			};
		}
	}

	const { error } = await supabase.from("reminders").insert({
		title: parsed.data.title,
		type: parsed.data.type,
		phone: parsed.data.phone || null,
		description: parsed.data.description || null,
		reminder_date: parsed.data.reminder_date,
		reminder_time: parsed.data.reminder_time || null,
		customer_id: parsed.data.customer_id || null,
		project_id: parsed.data.project_id || null,
		created_by: user.id,
		is_completed: parsed.data.is_completed,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidateReminderPaths();
	return { success: true };
}

export async function updateReminder(
	id: string,
	values: ReminderFormValues
): Promise<ActionResponse> {
	const parsed = reminderSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) {
		return { success: false, error: "Database connection failed" };
	}

	const { user, role, advisorId } = await getAuthContext(supabase);
	if (!user) return { success: false, error: "Unauthorized" };

	if (role === "advisor") {
		if (!advisorId) {
			return { success: false, error: "Advisor context missing" };
		}

		const { data: reminderRow } = await supabase
			.from("reminders")
			.select("id, customer_id, created_by")
			.eq("id", id)
			.maybeSingle();

		if (!reminderRow) return { success: false, error: "Reminder not found" };

		const allowed = await ensureAdvisorReminderAccess(
			supabase,
			user.id,
			advisorId,
			reminderRow.customer_id,
			id,
		);
		if (!allowed) {
			return { success: false, error: "Not allowed to update this reminder." };
		}
	}

	const { error } = await supabase
		.from("reminders")
		.update({
			title: parsed.data.title,
			type: parsed.data.type,
			phone: parsed.data.phone || null,
			description: parsed.data.description || null,
			reminder_date: parsed.data.reminder_date,
			reminder_time: parsed.data.reminder_time || null,
			customer_id: parsed.data.customer_id || null,
			project_id: parsed.data.project_id || null,
			is_completed: parsed.data.is_completed,
		})
		.eq("id", id);

	if (error) {
		return { success: false, error: error.message };
	}

	revalidateReminderPaths();
	return { success: true };
}

export async function deleteReminder(id: string): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) {
		return { success: false, error: "Database connection failed" };
	}

	const { user, role, advisorId } = await getAuthContext(supabase);
	if (!user) return { success: false, error: "Unauthorized" };

	if (role === "advisor") {
		if (!advisorId) {
			return { success: false, error: "Advisor context missing" };
		}

		const { data: reminderRow } = await supabase
			.from("reminders")
			.select("id, customer_id, created_by")
			.eq("id", id)
			.maybeSingle();

		const allowed = reminderRow
			? await ensureAdvisorReminderAccess(supabase, user.id, advisorId, reminderRow.customer_id, id)
			: false;
		if (!allowed) {
			return { success: false, error: "Not allowed to delete this reminder." };
		}
	}

	const { error } = await supabase.from("reminders").delete().eq("id", id);
	if (error) {
		return { success: false, error: error.message };
	}

	revalidateReminderPaths();
	return { success: true };
}

export async function getReminders() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { user, role, advisorId } = await getAuthContext(supabase);
	if (!user) return [];

	if (role === "advisor") {
		if (!advisorId) return [];

		const { data: customerRows } = await supabase
			.from("customers")
			.select("id")
			.eq("advisor_id", advisorId)
			.eq("lead_status", LEAD_STATUS.closedWon)
			.eq("is_active", true);

		const customerIds = (customerRows ?? []).map((c: any) => c.id);

		const [withCustomer, selfReminders] = await Promise.all([
			customerIds.length
				? supabase
						.from("reminders")
						.select(`
							*,
							customers(name, phone),
							projects(id, name)
						`)
						.in("customer_id", customerIds)
						.order("reminder_date", { ascending: true })
					: Promise.resolve({ data: [] as any[] }),
			supabase
				.from("reminders")
				.select(`
					*,
					customers(name, phone),
					projects(id, name)
				`)
				.eq("created_by", user.id)
				.is("customer_id", null)
				.order("reminder_date", { ascending: true }),
		]);

		const combined = [...((withCustomer as any).data ?? []), ...((selfReminders as any).data ?? [])];
		combined.sort((a: any, b: any) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime());
		return combined;
	}

	const { data, error } = await supabase
		.from("reminders")
		.select(`
			*,
			customers(name, phone),
			projects(id, name)
		`)
		.order("reminder_date", { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
}

export async function getPeopleWithBirthdayToday(): Promise<{
	customers: Array<{ id: string; name: string; phone: string; birth_date: string }>;
	advisors: Array<{ id: string; name: string; phone: string; birth_date: string }>;
}> {
	const supabase = await createClient();
	if (!supabase)
		return { customers: [], advisors: [] };

	const today = new Date();
	const month = today.getMonth() + 1;
	const day = today.getDate();

	const { data: customers } = await supabase
		.from("customers")
		.select("id, name, phone, birth_date")
		.not("birth_date", "is", null)
		.eq("is_active", true);

	const { data: advisors } = await supabase
		.from("advisors")
		.select("id, name, phone, birth_date")
		.not("birth_date", "is", null)
		.eq("is_active", true);

	const filterByToday = (rows: any[] | null) =>
		(rows || []).filter((r) => {
			if (!r.birth_date) return false;
			const d = new Date(r.birth_date);
			return d.getMonth() + 1 === month && d.getDate() === day;
		});

	return {
		customers: filterByToday(customers),
		advisors: filterByToday(advisors),
	};
}

export async function toggleReminder(id: string, isCompleted: boolean) {
	const supabase = await createClient();
	if (!supabase) {
		return { success: false, error: "Database connection failed" };
	}

	const { user, role, advisorId } = await getAuthContext(supabase);
	if (!user) return { success: false, error: "Unauthorized" };

	if (role === "advisor") {
		if (!advisorId) {
			return { success: false, error: "Advisor context missing" };
		}

		const { data: reminderRow } = await supabase
			.from("reminders")
			.select("id, customer_id, created_by")
			.eq("id", id)
			.maybeSingle();

		const allowed = reminderRow
			? await ensureAdvisorReminderAccess(supabase, user.id, advisorId, reminderRow.customer_id, id)
			: false;
		if (!allowed) {
			return { success: false, error: "Not allowed to update this reminder." };
		}
	}

	const { error } = await supabase
		.from("reminders")
		.update({ is_completed: isCompleted })
		.eq("id", id);

	if (error) return { success: false, error: error.message };

	revalidateReminderPaths();
	return { success: true };
}
