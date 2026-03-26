"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { deriveTaskStatus } from "@/lib/crm-utils";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export type FollowUpPayload = {
	follow_up_date?: string | null;
	next_follow_up_date?: string | null;
	whatsapp_done: boolean;
	call_done: boolean;
	site_visit_done: boolean;
	customer_mood?: string | null;
	notes?: string | null;
};



function deriveLeadStatus(data: FollowUpPayload, currentStatus: string): string {
	// Customer says Not Interested → Closed Lost immediately
	if (data.customer_mood === "Not Interested") return "Closed Lost";

	// Never regress from a closed state
	if (currentStatus === "Closed Won" || currentStatus === "Closed Lost") return currentStatus;

	// Stage 3: Site visit physically happened
	if (data.site_visit_done) return "Site Visit Done";

	// Stage 2: Both WhatsApp AND Call done + site visit date scheduled
	// → "Site Visit Scheduled" (display label: "Contact Done — Site Visit Pending")
	if (data.whatsapp_done && data.call_done && data.next_follow_up_date) {
		return "Site Visit Scheduled";
	}

	// Stage 1: WhatsApp OR Call done (partial contact)
	// → "Contacted" (display label: "Contact Pending")
	if (data.whatsapp_done || data.call_done) {
		// Never regress a lead that has already progressed further
		const advancedStatuses = ["Site Visit Scheduled", "Site Visit Done", "Negotiation"];
		if (advancedStatuses.includes(currentStatus)) return currentStatus;
		return "Contacted";
	}

	// No interaction checkboxes marked — keep current status (mood/notes only)
	return currentStatus;
}


export async function addFollowUp(
	customerId: string,
	data: FollowUpPayload
): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase
		.from("customer_follow_ups")
		.insert({
			customer_id: customerId,
			follow_up_date: data.follow_up_date || new Date().toISOString(),
			next_follow_up_date: data.next_follow_up_date || null,
			whatsapp_done: data.whatsapp_done,
			call_done: data.call_done,
			site_visit_done: data.site_visit_done,
			customer_mood: data.customer_mood || null,
			notes: data.notes || null,
		});

	if (error) {
		return { success: false, error: error.message };
	}

	// Fetch current lead_status
	const { data: customerRow } = await supabase
		.from("customers")
		.select("lead_status")
		.eq("id", customerId)
		.single();

	const currentStatus = customerRow?.lead_status || "New Lead";
	const newLeadStatus = deriveLeadStatus(data, currentStatus);

	// Only update if status changed
	if (newLeadStatus !== currentStatus) {
		const updatePayload: any = { lead_status: newLeadStatus };
		// Closed Lost = inactive, Closed Won = active
		if (newLeadStatus === "Closed Won") updatePayload.is_active = true;
		if (newLeadStatus === "Closed Lost") updatePayload.is_active = false;
		await supabase.from("customers").update(updatePayload).eq("id", customerId);
	}

	revalidatePath("/enquiries");
	revalidatePath("/advisor/enquiries");
	revalidatePath(`/enquiries/${customerId}`);
	revalidatePath("/customers");

	return { success: true };
}

export async function getCustomerFollowUps(customerId: string) {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("customer_follow_ups")
		.select("*")
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching follow-ups:", error.message);
		return [];
	}

	// Attach derived task_status to each row
	return (data || []).map((f: any) => ({
		...f,
		task_status: deriveTaskStatus(f),
	}));
}
