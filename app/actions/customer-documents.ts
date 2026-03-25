"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CustomerDocumentRow = {
	id: string;
	customer_id: string;
	doc_category: string;
	doc_type: string;
	file_path: string;
	file_name: string | null;
	mime_type: string | null;
	notes: string | null;
	created_at: string;
};

export async function getCustomerDocuments(customerId: string) {
	const supabase = await createClient();
	if (!supabase) return [];

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) return [];

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	if (role === "advisor" && advisorId) {
		// Ensure the customer belongs to the logged-in advisor before showing docs.
		const { data: customer, error: customerErr } = await supabase
			.from("customers")
			.select("id")
			.eq("id", customerId)
			.eq("advisor_id", advisorId)
			.maybeSingle();

		if (customerErr || !customer) return [];
	}

	const { data, error } = await supabase
		.from("customer_documents")
		.select("*")
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	return (data ?? []) as CustomerDocumentRow[];
}

export async function createCustomerDocument(values: {
	customer_id: string;
	doc_category: string;
	doc_type: string;
	file_path: string;
	file_name?: string;
	mime_type?: string;
	notes?: string;
}) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) return { success: false, error: "Unauthorized" };

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	if (role === "advisor" && advisorId) {
		const { data: customer, error: customerErr } = await supabase
			.from("customers")
			.select("id")
			.eq("id", values.customer_id)
			.eq("advisor_id", advisorId)
			.maybeSingle();

		if (customerErr || !customer) {
			return { success: false, error: "Not allowed" };
		}
	}

	const { error } = await supabase.from("customer_documents").insert({
		customer_id: values.customer_id,
		doc_category: values.doc_category,
		doc_type: values.doc_type,
		file_path: values.file_path,
		file_name: values.file_name || null,
		mime_type: values.mime_type || null,
		notes: values.notes || null,
	});

	if (error) return { success: false, error: error.message };

	revalidatePath(
		role === "advisor"
			? `/advisor/customers/${values.customer_id}`
			: `/customers/${values.customer_id}`
	);
	return { success: true };
}

export async function deleteCustomerDocument(id: string, customerId: string) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) return { success: false, error: "Unauthorized" };

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	if (role === "advisor" && advisorId) {
		const { data: customer, error: customerErr } = await supabase
			.from("customers")
			.select("id")
			.eq("id", customerId)
			.eq("advisor_id", advisorId)
			.maybeSingle();

		if (customerErr || !customer) {
			return { success: false, error: "Not allowed" };
		}
	}

	const { error } = await supabase
		.from("customer_documents")
		.delete()
		.eq("id", id)
		.eq("customer_id", customerId);
	if (error) return { success: false, error: error.message };

	revalidatePath(
		role === "advisor" ? `/advisor/customers/${customerId}` : `/customers/${customerId}`
	);
	return { success: true };
}

