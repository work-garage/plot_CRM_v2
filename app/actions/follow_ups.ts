"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

    // Auto-update the lead_status of the customer based on mood or action (optional but requested to keep pipeline fresh)
    let lead_status_update = "Follow-up";
    if (data.site_visit_done) {
        lead_status_update = "Site Visit Done";
    } else if (data.next_follow_up_date && data.site_visit_done === false) {
        lead_status_update = "Site Visit Scheduled"; // Simplified logic for demo
    }

    if (data.customer_mood === "Interested") {
        lead_status_update = "Negotiation";
    } else if (data.customer_mood === "Not Interested") {
        lead_status_update = "Closed Lost";
    }
    
    // Attempt non-blocking update to customer status
    await supabase.from("customers").update({ lead_status: lead_status_update }).eq("id", customerId);

    revalidatePath("/enquiries");
    revalidatePath(`/enquiries/${customerId}`);
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    
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

    return data || [];
}
