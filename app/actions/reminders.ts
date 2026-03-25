"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	reminderSchema,
	type ReminderFormValues,
} from "@/lib/validations/reminder";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

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

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const role = (user?.user_metadata as any)?.role;
	const advisorId = (user?.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	// Advisors can only create reminders for their own customers.
	if (role === "advisor" && !advisorId) {
		return { success: false, error: "Advisor context missing" };
	}

	if (role === "advisor" && advisorId) {
		if (parsed.data.customer_id) {
			const { data: okCust } = await supabase
				.from("customers")
				.select("id")
				.eq("id", parsed.data.customer_id)
				.eq("advisor_id", advisorId)
				.eq("is_active", true)
				.maybeSingle();

			if (!okCust?.id) {
				return {
					success: false,
					error: "Not allowed to create reminders for this customer.",
				};
			}
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
		is_completed: parsed.data.is_completed,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/messaging");
	revalidatePath("/dashboard");
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

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const role = (user?.user_metadata as any)?.role;
	const advisorId = (user?.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	// Enforce advisor ownership before updating.
	if (role === "advisor" && !advisorId) {
		return { success: false, error: "Advisor context missing" };
	}

	if (role === "advisor" && advisorId) {
		const { data: reminderRow } = await supabase
			.from("reminders")
			.select("id, customer_id")
			.eq("id", id)
			.single();

		if (!reminderRow) return { success: false, error: "Reminder not found" };

		if (reminderRow.customer_id) {
			const { data: okCust } = await supabase
				.from("customers")
				.select("id")
				.eq("id", reminderRow.customer_id)
				.eq("advisor_id", advisorId)
				.eq("is_active", true)
				.maybeSingle();

			if (!okCust?.id) {
				return { success: false, error: "Not allowed to update this reminder." };
			}
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

	revalidatePath("/messaging");
	revalidatePath("/dashboard");
	return { success: true };
}

export async function deleteReminder(id: string): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) {
		return { success: false, error: "Database connection failed" };
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const role = (user?.user_metadata as any)?.role;
	const advisorId = (user?.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	// Advisors can only delete their own customer reminders.
	if (role === "advisor" && !advisorId) {
		return { success: false, error: "Advisor context missing" };
	}

	if (role === "advisor" && advisorId) {
		const { data: reminderRow } = await supabase
			.from("reminders")
			.select("id, customer_id")
			.eq("id", id)
			.single();

		if (reminderRow?.customer_id) {
			const { data: okCust } = await supabase
				.from("customers")
				.select("id")
				.eq("id", reminderRow.customer_id)
				.eq("advisor_id", advisorId)
				.eq("is_active", true)
				.maybeSingle();

			if (!okCust?.id) {
				return { success: false, error: "Not allowed to delete this reminder." };
			}
		}
	}

	const { error } = await supabase.from("reminders").delete().eq("id", id);

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/messaging");
	revalidatePath("/dashboard");
	return { success: true };
}

export async function getReminders() {
	const supabase = await createClient();
	if (!supabase) return [];

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const role = (user?.user_metadata as any)?.role;
	const advisorId = (user?.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	// Advisor: only show reminders linked to their customers (plus self reminders with null customer_id)
	if (role === "advisor" && !advisorId) {
		return [];
	}

	if (role === "advisor" && advisorId) {
		const { data: customerRows } = await supabase
			.from("customers")
			.select("id")
			.eq("advisor_id", advisorId)
			.eq("is_active", true);

		const customerIds = (customerRows ?? []).map((c: any) => c.id);

		const [withCustomer, selfReminders] = await Promise.all([
			customerIds.length
				? supabase
						.from("reminders")
						.select(
							`
            *,
            customers(name, phone),
            projects(id, name),
            plot_sales(id, emi_day, monthly_emi, remaining_amount)
          `
						)
						.in("customer_id", customerIds)
						.neq("type", "installment_due")
				: Promise.resolve({ data: [] as any[], error: null }),
			supabase
				.from("reminders")
				.select(
					`
          *,
          customers(name, phone),
          projects(id, name),
          plot_sales(id, emi_day, monthly_emi, remaining_amount)
        `
				)
				.is("customer_id", null)
				.neq("type", "installment_due"),
		]);

		const combined = [
			...(withCustomer as any).data ?? [],
			...(selfReminders as any).data ?? [],
		];

		combined.sort(
			(a: any, b: any) =>
				new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime()
		);
		return combined;
	}

	const { data, error } = await supabase
		.from("reminders")
		.select(
			`
      *,
      customers(name, phone),
      projects(id, name),
      plot_sales(id, emi_day, monthly_emi, remaining_amount)
    `
		)
		.neq("type", "installment_due")
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

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const role = (user?.user_metadata as any)?.role;
	const advisorId = (user?.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	if (role === "advisor" && !advisorId) {
		return { success: false, error: "Advisor context missing" };
	}

	if (role === "advisor" && advisorId) {
		const { data: reminderRow } = await supabase
			.from("reminders")
			.select("id, customer_id")
			.eq("id", id)
			.single();

		if (reminderRow?.customer_id) {
			const { data: okCust } = await supabase
				.from("customers")
				.select("id")
				.eq("id", reminderRow.customer_id)
				.eq("advisor_id", advisorId)
				.eq("is_active", true)
				.maybeSingle();

			if (!okCust?.id) {
				return { success: false, error: "Not allowed to update this reminder." };
			}
		}
	}

	const { error } = await supabase
		.from("reminders")
		.update({ is_completed: isCompleted })
		.eq("id", id);

	if (error) return { success: false, error: error.message };

	revalidatePath("/messaging");
	revalidatePath("/dashboard");
	return { success: true };
}
