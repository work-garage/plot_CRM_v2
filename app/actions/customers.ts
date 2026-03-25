"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	customerSchema,
	type CustomerFormValues,
} from "@/lib/validations/customer";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

function mapCustomerDbError(error: { code?: string; message: string }): string {
	if (error.code === "23505" && /(phone|customers_phone_unique)/i.test(error.message)) {
		return "A customer with this phone number already exists.";
	}
	return error.message;
}

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

async function syncCustomerBirthdayReminder(
	supabase: any,
	customer: { id: string; name: string; phone: string; birth_date?: string | null },
) {
	const marker = `AUTO_BIRTHDAY:customer:${customer.id}`;
	const { data: existing } = await supabase
		.from("reminders")
		.select("id")
		.eq("description", marker)
		.maybeSingle();

	const nextDate = customer.birth_date ? getNextBirthdayDate(customer.birth_date) : null;
	if (!nextDate) {
		if (existing?.id) {
			await supabase.from("reminders").delete().eq("id", existing.id);
		}
		return;
	}

	const payload = {
		title: `Birthday Wish - ${customer.name}`,
		type: "birthday_customer",
		phone: customer.phone || null,
		description: marker,
		reminder_date: nextDate,
		reminder_time: "09:00",
		customer_id: customer.id,
		project_id: null,
		is_completed: false,
	};

	if (existing?.id) {
		await supabase.from("reminders").update(payload).eq("id", existing.id);
	} else {
		await supabase.from("reminders").insert(payload);
	}
}

export async function createCustomer(
	values: CustomerFormValues
): Promise<ActionResponse> {
	const parsed = customerSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { success: false, error: "Unauthorized" };
	}

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	const resolvedAdvisorId =
		role === "advisor" ? advisorId ?? null : parsed.data.advisor_id ?? null;

	if (role === "advisor" && !resolvedAdvisorId) {
		return { success: false, error: "Advisor context missing" };
	}

	const { data: insertedCustomer, error } = await supabase
		.from("customers")
		.insert({
		name: parsed.data.name,
		phone: parsed.data.phone,
		alternate_phone: parsed.data.alternate_phone || null,
		address: parsed.data.address || null,
		birth_date: parsed.data.birth_date || null,
		advisor_id: resolvedAdvisorId,
		route: parsed.data.route || null,
		notes: parsed.data.notes || null,
		is_active: parsed.data.is_active,
	})
		.select("id, name, phone, birth_date")
		.single();

	if (error) {
		return { success: false, error: mapCustomerDbError(error) };
	}

	if (insertedCustomer?.id) {
		await syncCustomerBirthdayReminder(supabase, insertedCustomer);
	}

	revalidatePath(role === "advisor" ? "/advisor/customers" : "/customers");
	revalidatePath("/messaging");
	return { success: true };
}

export async function updateCustomer(
	id: string,
	values: CustomerFormValues
): Promise<ActionResponse> {
	const parsed = customerSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { success: false, error: "Unauthorized" };
	}

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	if (role === "advisor" && !advisorId) {
		return { success: false, error: "Advisor context missing" };
	}

	const { data: updatedCustomer, error } = await supabase
		.from("customers")
		.update({
			name: parsed.data.name,
			phone: parsed.data.phone,
			alternate_phone: parsed.data.alternate_phone || null,
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			advisor_id: role === "advisor" ? (advisorId ?? null) : (parsed.data.advisor_id || null),
			route: parsed.data.route || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		// Advisors can only update their own customers
		.eq(role === "advisor" ? "advisor_id" : "id", role === "advisor" ? (advisorId ?? null) : id)
		.select("id, name, phone, birth_date")
		.single();

	if (error) {
		return { success: false, error: mapCustomerDbError(error) };
	}

	if (updatedCustomer?.id) {
		await syncCustomerBirthdayReminder(supabase, updatedCustomer);
	}

	revalidatePath(role === "advisor" ? "/advisor/customers" : "/customers");
	revalidatePath(
		role === "advisor" ? `/advisor/customers/${id}` : `/customers/${id}`
	);
	revalidatePath("/messaging");
	return { success: true };
}

export async function getCustomers() {
	const supabase = await createClient();
	if (!supabase) return [];

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr) return [];

	const role = (user?.user_metadata as any)?.role;
	const advisorId = (user?.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	let query = supabase
		.from("customers")
		.select(
			`
      *,
      advisors(name)
    `
		)
		.order("name", { ascending: true });

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId);
	}

	const { data, error } = await query;

	if (error) throw new Error(error.message);
	return data || [];
}

export async function getCustomerById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) return null;

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	let query = supabase
		.from("customers")
		.select("*")
		.eq("id", id);

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId).eq("is_active", true);
	}

	const { data, error } = await query.single();
	if (error) return null;
	return data;
}
