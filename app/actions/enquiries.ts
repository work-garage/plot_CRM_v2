"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	enquiryCustomerSchema,
	type EnquiryCustomerFormValues,
} from "@/lib/validations/enquiry";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export type EnquiryRow = {
	id: string;
	name: string;
	phone: string;
	alternate_phone: string | null;
	email: string | null;
	city: string | null;
	address: string | null;
	birth_date: string | null;
	category: string;
	details: string | null;
	project_id: string | null;
	project_name: string | null;
	is_active: boolean;
	created_at: string;
	follow_up_date: string | null;
	interested_plan: string | null;
	enquiry_status: string;
	advisor_id: string | null;
	advisor_name: string | null;

	// CRM Fields
	lead_status: string;
	lead_source: string | null;
	property_type: string | null;
	segment: string | null;
	budget_min: number | null;
	budget_max: number | null;
	bhk_size: string | null;
	preferred_location: string | null;
};

export async function getEnquiryCustomers(): Promise<EnquiryRow[]> {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return [];

	const role = (user?.user_metadata as any)?.role;
	const advisorId = (user?.user_metadata as any)?.advisor_id;

	// Fetch ALL leads (active and inactive) — tabs filter on the frontend
	let query = supabase
		.from("customers")
		.select(`
			id, name, phone, alternate_phone, email, city, address, birth_date,
			is_active, created_at, notes, advisor_id,
			lead_status, lead_source, property_type, segment,
			budget_min, budget_max, bhk_size, preferred_location,
			advisors ( name ),
			customer_project_interests (
				project_id, projects ( name )
			)
		`)
		.order("created_at", { ascending: false });

	// Advisor can only see their own leads
	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId);
	}

	const { data, error } = await query;
	if (error) throw new Error(error.message);

	return (data ?? []).map((c: any) => {
		const interest = c.customer_project_interests?.[0];
		return {
			id: c.id,
			name: c.name,
			phone: c.phone,
			alternate_phone: c.alternate_phone,
			email: c.email,
			city: c.city,
			address: c.address,
			birth_date: c.birth_date,
			category: c.property_type || c.segment || "",
			details: c.notes,
			project_id: interest?.project_id || null,
			project_name: interest?.projects?.name || null,
			is_active: !!c.is_active,
			created_at: c.created_at,
			follow_up_date: null,
			interested_plan: c.property_type,
			enquiry_status: c.lead_status || "New Lead",
			advisor_id: c.advisor_id,
			advisor_name: c.advisors?.name || null,

			// CRM fields
			lead_status: c.lead_status || "New Lead",
			lead_source: c.lead_source,
			property_type: c.property_type,
			segment: c.segment,
			budget_min: c.budget_min,
			budget_max: c.budget_max,
			bhk_size: c.bhk_size,
			preferred_location: c.preferred_location,
		};
	}) as EnquiryRow[];
}

export async function createEnquiryCustomer(
	values: EnquiryCustomerFormValues
): Promise<{ success: boolean; error?: string; customerId?: string }> {
	const parsed = enquiryCustomerSchema.safeParse(values);
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return { success: false, error: "Unauthorized" };

	const role = (user?.user_metadata as any)?.role;
	let advisorId = (user?.user_metadata as any)?.advisor_id;

	// Admin can explicitly assign an advisor_id from the form
	if (role !== "advisor" && parsed.data.advisor_id) {
		advisorId = parsed.data.advisor_id;
	}

	const { data: existing, error: findErr } = await supabase
		.from("customers")
		.select("id")
		.eq("phone", parsed.data.phone)
		.maybeSingle();

	let customerId = existing?.id;

	const customerPayload: any = {
		name: parsed.data.name,
		phone: parsed.data.phone,
		alternate_phone: parsed.data.alternate_phone || null,
		email: parsed.data.email || null,
		city: parsed.data.city || null,
		address: parsed.data.address || parsed.data.preferred_location || null,
		birth_date: parsed.data.birth_date || null,
		notes: parsed.data.details || null,
		property_type: parsed.data.property_type || null,
		segment: parsed.data.segment || null,
		budget_min: parsed.data.budget_min || null,
		budget_max: parsed.data.budget_max || null,
		preferred_location: parsed.data.preferred_location || null,
		bhk_size: parsed.data.bhk_size || null,
		lead_source: parsed.data.lead_source || null,
		lead_status: parsed.data.enquiry_status || "New Lead",
	};

	if (advisorId) {
		customerPayload.advisor_id = advisorId;
	}

	if (customerId) {
		const { error: updErr } = await supabase.from("customers").update(customerPayload).eq("id", customerId);
		if (updErr) return { success: false, error: updErr.message };
	} else {
		customerPayload.is_active = false; // New enquiry = inactive (not yet a confirmed buyer)
		const { data: inserted, error: insErr } = await supabase
			.from("customers")
			.insert(customerPayload)
			.select("id")
			.single();

		if (insErr || !inserted) return { success: false, error: insErr?.message || "Failed to create" };
		customerId = inserted.id;
	}

	// Link Project interest
	if (parsed.data.project_id && customerId) {
		await supabase.from("customer_project_interests").insert({
			customer_id: customerId,
			project_id: parsed.data.project_id
		}).select("id").maybeSingle();
	}

	revalidatePath("/enquiries");
	revalidatePath("/advisor/enquiries");
	revalidatePath("/customers");

	return { success: true, customerId };
}

export async function updateEnquiryCustomer(
	id: string,
	values: EnquiryCustomerFormValues
): Promise<ActionResponse> {
	const parsed = enquiryCustomerSchema.safeParse(values);
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return { success: false, error: "Unauthorized" };

	const role = (user?.user_metadata as any)?.role;

	const customerPayload: any = {
		name: parsed.data.name,
		phone: parsed.data.phone,
		alternate_phone: parsed.data.alternate_phone || null,
		email: parsed.data.email || null,
		city: parsed.data.city || null,
		address: parsed.data.address || parsed.data.preferred_location || null,
		birth_date: parsed.data.birth_date || null,
		notes: parsed.data.details || null,
		property_type: parsed.data.property_type || null,
		segment: parsed.data.segment || null,
		budget_min: parsed.data.budget_min || null,
		budget_max: parsed.data.budget_max || null,
		preferred_location: parsed.data.preferred_location || null,
		bhk_size: parsed.data.bhk_size || null,
		lead_source: parsed.data.lead_source || null,
		lead_status: parsed.data.enquiry_status || "New Lead",
	};

	// Admin can reassign advisor
	if (role !== "advisor" && parsed.data.advisor_id !== undefined) {
		customerPayload.advisor_id = parsed.data.advisor_id || null;
	}

	// If lead was marked as Closed Won, promote to active customer
	if (customerPayload.lead_status === "Closed Won") {
		customerPayload.is_active = true;
	}
	// If re-opened from Closed Won, deactivate
	if (customerPayload.lead_status === "Closed Lost") {
		customerPayload.is_active = false;
	}

	const { error } = await supabase
		.from("customers")
		.update(customerPayload)
		.eq("id", id);

	if (error) return { success: false, error: error.message };

	if (parsed.data.project_id) {
		await supabase.from("customer_project_interests").insert({
			customer_id: id,
			project_id: parsed.data.project_id
		}).select("id").maybeSingle();
	}

	revalidatePath("/enquiries");
	revalidatePath("/advisor/enquiries");
	revalidatePath("/customers");
	revalidatePath(`/customers/${id}`);
	return { success: true };
}

export async function upgradeEnquiryToCustomer(opts: {
	enquiryId: string;
}): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase
		.from("customers")
		.update({
			is_active: true,
			lead_status: "Closed Won"
		})
		.eq("id", opts.enquiryId);

	if (error) return { success: false, error: error.message };

	revalidatePath("/enquiries");
	revalidatePath("/advisor/enquiries");
	revalidatePath("/customers");
	revalidatePath("/reports");

	return { success: true };
}

export async function markLeadAsLost(enquiryId: string): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase
		.from("customers")
		.update({
			is_active: false,
			lead_status: "Closed Lost"
		})
		.eq("id", enquiryId);

	if (error) return { success: false, error: error.message };

	revalidatePath("/enquiries");
	revalidatePath("/advisor/enquiries");
	revalidatePath("/customers");

	return { success: true };
}

// Legacy stubs
export async function getTempCustomersByPhone(phone: string): Promise<any[]> {
	return [];
}

export async function getEnquiryTempCustomersForModal(): Promise<any[]> {
	return [];
}

export async function getEnquiryLinkedCustomers(enquiryId: string): Promise<any[]> {
	return [];
}

export async function upgradeTempCustomerToCustomer(opts: { customerId: string }): Promise<ActionResponse> {
	return upgradeEnquiryToCustomer({ enquiryId: opts.customerId });
}
