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


function deriveLeadStatus(
	data: FollowUpPayload,
	currentStatus: string
): string {
	// Not Interested → immediate Closed Lost
	if (data.customer_mood === "Not Interested") return "Closed Lost";

	// Site visit completed
	if (data.site_visit_done) return "Site Visit Done";

	// Next follow-up date scheduled without site visit = planning it
	if (!data.site_visit_done && data.next_follow_up_date) {
		// Only advance to Site Visit Scheduled if already contacted
		if (
			["Contacted", "Follow-up", "Negotiation", "Site Visit Scheduled"].includes(currentStatus) === false &&
			currentStatus !== "New Lead"
		) {
			return "Follow-up";
		}
		// Interested + next date = nudge toward negotiation
		if (data.customer_mood === "Interested" && currentStatus === "Site Visit Done") {
			return "Negotiation";
		}
		return currentStatus === "New Lead" ? "Contacted" : "Follow-up";
	}

	// Call done → at least Contacted
	if (data.call_done || data.whatsapp_done) {
		if (currentStatus === "New Lead") return "Contacted";
		if (currentStatus === "Contacted") return "Follow-up";
	}

	// Interested mood + already in Follow-up/Site Visit Done → Negotiation
	if (data.customer_mood === "Interested") {
		if (currentStatus === "Site Visit Done") return "Negotiation";
		if (currentStatus === "Follow-up") return "Negotiation";
	}

	return currentStatus; // No change
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
