"use server";

import { createClient } from "@/lib/supabase/server";
import { getCustomers } from "@/app/actions/customers";
import { getAdvisors } from "@/app/actions/advisors";

export type MessagingPerson = {
	id: string;
	role: "customer" | "advisor" | "employee";
	name: string;
	phone: string | null;
	birth_date: string | null;
	is_active: boolean;
	subtitle?: string;
};

/** Combined directory for bulk messaging (customers, advisors, HR employees). */
export async function getMessagingDirectory(): Promise<MessagingPerson[]> {
	const supabase = await createClient();
	const [customers, advisors] = await Promise.all([getCustomers(), getAdvisors()]);

	let employees: Array<{
		id: string;
		name: string;
		employee_code: string;
		phone: string | null;
		birth_date?: string | null;
	}> = [];

	if (supabase) {
		const { data, error } = await supabase
			.from("hr_employees")
			.select("id,name,employee_code,phone,birth_date")
			.order("name", { ascending: true });
		if (!error && data) {
			employees = data as typeof employees;
		}
	}

	const out: MessagingPerson[] = [];

	for (const c of customers as any[]) {
		out.push({
			id: c.id,
			role: "customer",
			name: c.name,
			phone: c.phone ?? null,
			birth_date: c.birth_date ?? null,
			is_active: !!c.is_active,
			subtitle: c.advisors?.name ? `Advisor: ${c.advisors.name}` : undefined,
		});
	}

	for (const a of advisors as any[]) {
		out.push({
			id: a.id,
			role: "advisor",
			name: a.name,
			phone: a.phone ?? null,
			birth_date: a.birth_date ?? null,
			is_active: a.is_active !== false,
			subtitle: a.code ? `Code: ${a.code}` : undefined,
		});
	}

	for (const e of employees) {
		out.push({
			id: e.id,
			role: "employee",
			name: e.name,
			phone: e.phone ?? null,
			birth_date: e.birth_date ?? null,
			is_active: true,
			subtitle: `Emp #${e.employee_code}`,
		});
	}

	return out;
}
