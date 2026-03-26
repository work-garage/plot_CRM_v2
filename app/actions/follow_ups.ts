"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { deriveTaskStatus } from "@/lib/crm-utils";
import { LEAD_STATUS } from "@/lib/constants/lead-status";

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
  if (data.customer_mood === "Not Interested") return LEAD_STATUS.closedLost;
  if (currentStatus === LEAD_STATUS.closedWon || currentStatus === LEAD_STATUS.closedLost) return currentStatus;
  if (data.site_visit_done) return LEAD_STATUS.siteVisitDone;
  if (data.whatsapp_done && data.call_done && data.next_follow_up_date) {
    return LEAD_STATUS.contactDone;
  }
  if (data.whatsapp_done || data.call_done) {
    if (currentStatus === LEAD_STATUS.contactDone || currentStatus === LEAD_STATUS.siteVisitDone) {
      return currentStatus;
    }
    return LEAD_STATUS.contactPending;
  }
  return currentStatus;
}

export async function addFollowUp(
  customerId: string,
  data: FollowUpPayload,
): Promise<ActionResponse> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database connection failed" };

  const [{ data: existingFollowUps }, { data: customerRow }] = await Promise.all([
    supabase
      .from("customer_follow_ups")
      .select("whatsapp_done, call_done, site_visit_done")
      .eq("customer_id", customerId),
    supabase
      .from("customers")
      .select("id, lead_status, advisor_id")
      .eq("id", customerId)
      .single(),
  ]);

  const cumulativeState = {
    whatsapp_done: Boolean(data.whatsapp_done || (existingFollowUps ?? []).some((row: any) => row.whatsapp_done)),
    call_done: Boolean(data.call_done || (existingFollowUps ?? []).some((row: any) => row.call_done)),
    site_visit_done: Boolean(data.site_visit_done || (existingFollowUps ?? []).some((row: any) => row.site_visit_done)),
  };

  const payload = {
    customer_id: customerId,
    follow_up_date: data.follow_up_date || new Date().toISOString(),
    next_follow_up_date: data.next_follow_up_date || null,
    whatsapp_done: cumulativeState.whatsapp_done,
    call_done: cumulativeState.call_done,
    site_visit_done: cumulativeState.site_visit_done,
    customer_mood: data.customer_mood || null,
    notes: data.notes || null,
  };

  const { error } = await supabase.from("customer_follow_ups").insert(payload);
  if (error) {
    return { success: false, error: error.message };
  }

  const currentStatus = customerRow?.lead_status || LEAD_STATUS.newLead;
  const newLeadStatus = deriveLeadStatus({ ...data, ...cumulativeState }, currentStatus);

  if (newLeadStatus !== currentStatus) {
    const updatePayload: Record<string, unknown> = { lead_status: newLeadStatus };
    if (newLeadStatus === LEAD_STATUS.closedWon) {
      updatePayload.is_active = true;
      updatePayload.won_at = new Date().toISOString();
      updatePayload.lost_at = null;
    }
    if (newLeadStatus === LEAD_STATUS.closedLost) {
      updatePayload.is_active = false;
      updatePayload.lost_at = new Date().toISOString();
    }
    await supabase.from("customers").update(updatePayload).eq("id", customerId);
  }

  revalidatePath("/enquiries");
  revalidatePath("/advisor/enquiries");
  revalidatePath("/customers");
  revalidatePath("/advisor/customers");

  if (customerRow?.advisor_id) {
    revalidatePath("/advisor");
  }

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

  return (data || []).map((followUp: any) => ({
    ...followUp,
    task_status: deriveTaskStatus(followUp),
  }));
}
