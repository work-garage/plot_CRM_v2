"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  enquiryCustomerSchema,
  type EnquiryCustomerFormValues,
} from "@/lib/validations/enquiry";
import { getScopeContext } from "@/lib/server/scope";
import { LEAD_STATUS } from "@/lib/constants/lead-status";

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
  enquiry_status: string;
  advisor_id: string | null;
  advisor_name: string | null;
  source_advisor_id: string | null;
  lead_status: string;
  lead_source: string | null;
  property_type: string | null;
  segment: string | null;
  budget_min: number | null;
  budget_max: number | null;
  bhk_size: string | null;
  preferred_location: string | null;
  task_status: "Completed" | "Pending";
  updated_at: string;
  site_visit_date: string | null;
};

function deriveLeadStatusFromFollowUps(
  currentStatus: string | null | undefined,
  rows: Array<{
    whatsapp_done?: boolean | null;
    call_done?: boolean | null;
    site_visit_done?: boolean | null;
    customer_mood?: string | null;
  }>,
): string {
  const status = currentStatus || LEAD_STATUS.newLead;
  if (status === LEAD_STATUS.closedWon || status === LEAD_STATUS.closedLost) {
    return status;
  }

  const cumulative = rows.reduce<{
    whatsapp_done: boolean;
    call_done: boolean;
    site_visit_done: boolean;
    notInterested: boolean;
  }>(
    (acc, row) => ({
      whatsapp_done: acc.whatsapp_done || Boolean(row.whatsapp_done),
      call_done: acc.call_done || Boolean(row.call_done),
      site_visit_done: acc.site_visit_done || Boolean(row.site_visit_done),
      notInterested: acc.notInterested || row.customer_mood === "Not Interested",
    }),
    { whatsapp_done: false, call_done: false, site_visit_done: false, notInterested: false },
  );

  if (cumulative.notInterested) return LEAD_STATUS.closedLost;
  if (cumulative.site_visit_done) return LEAD_STATUS.siteVisitDone;
  if (cumulative.whatsapp_done && cumulative.call_done) return LEAD_STATUS.contactDone;
  if (cumulative.whatsapp_done || cumulative.call_done) return LEAD_STATUS.contactPending;
  return status;
}

function getLeadStatusPayload(status: string) {
  if (status === LEAD_STATUS.closedWon) {
    return {
      lead_status: status,
      is_active: true,
      won_at: new Date().toISOString(),
      lost_at: null,
    };
  }

  if (status === LEAD_STATUS.closedLost) {
    return {
      lead_status: status,
      is_active: false,
      lost_at: new Date().toISOString(),
    };
  }

  return {
    lead_status: status,
    is_active: false,
  };
}

export async function getEnquiryCustomers(): Promise<EnquiryRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { user, role, advisorId } = await getScopeContext(supabase);
  if (!user) return [];

  let query = supabase
    .from("customers")
    .select(`
      id, name, phone, alternate_phone, email, city, address, birth_date,
      is_active, created_at, updated_at, notes, advisor_id, source_advisor_id,
      lead_status, lead_source, property_type, segment,
      budget_min, budget_max, bhk_size, preferred_location,
      advisors!advisor_id ( name ),
      customer_project_interests (
        project_id, projects ( name )
      ),
      customer_follow_ups (
        whatsapp_done, call_done, site_visit_done, follow_up_date, next_follow_up_date
      )
    `)
    .order("created_at", { ascending: false });

  if (role === "advisor") {
    if (!advisorId) return [];
    query = query.eq("advisor_id", advisorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((customer: any) => {
    const interest = customer.customer_project_interests?.[0];
    const sortedFollowUps = [...(customer.customer_follow_ups ?? [])].sort(
      (a, b) => new Date(b.follow_up_date || 0).getTime() - new Date(a.follow_up_date || 0).getTime(),
    );
    const siteVisitPending = sortedFollowUps.find((row) => row.next_follow_up_date && !row.site_visit_done);
    const derivedLeadStatus = deriveLeadStatusFromFollowUps(customer.lead_status, sortedFollowUps);
    const cumulativeTaskComplete = sortedFollowUps.some((row) => row.site_visit_done)
      && sortedFollowUps.some((row) => row.whatsapp_done)
      && sortedFollowUps.some((row) => row.call_done);

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      alternate_phone: customer.alternate_phone,
      email: customer.email,
      city: customer.city,
      address: customer.address,
      birth_date: customer.birth_date,
      category: customer.property_type || customer.segment || "",
      details: customer.notes,
      project_id: interest?.project_id || null,
      project_name: interest?.projects?.name || null,
      is_active: Boolean(customer.is_active),
      created_at: customer.created_at,
      follow_up_date: null,
      enquiry_status: derivedLeadStatus,
      advisor_id: customer.advisor_id,
      advisor_name: customer.advisors?.name || null,
      source_advisor_id: customer.source_advisor_id,
      lead_status: derivedLeadStatus,
      lead_source: customer.lead_source,
      property_type: customer.property_type,
      segment: customer.segment,
      budget_min: customer.budget_min,
      budget_max: customer.budget_max,
      bhk_size: customer.bhk_size,
      preferred_location: customer.preferred_location,
      task_status: cumulativeTaskComplete ? "Completed" : "Pending",
      updated_at: customer.updated_at,
      site_visit_date:
        derivedLeadStatus === LEAD_STATUS.siteVisitDone
          ? null
          : siteVisitPending?.next_follow_up_date ?? null,
    };
  }) as EnquiryRow[];
}

export async function createEnquiryCustomer(
  values: EnquiryCustomerFormValues,
): Promise<{ success: boolean; error?: string; customerId?: string }> {
  const parsed = enquiryCustomerSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  // Validate budget range
  const budgetMin = Number(parsed.data.budget_min ?? 0);
  const budgetMax = Number(parsed.data.budget_max ?? 0);
  if (budgetMax > 0 && budgetMin > budgetMax) {
    return { success: false, error: "Minimum budget cannot be greater than maximum budget" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database connection failed" };

  const { user, role, advisorId } = await getScopeContext(supabase);
  if (!user) return { success: false, error: "Unauthorized" };

  const resolvedAdvisorId = role === "advisor" ? advisorId : parsed.data.advisor_id ?? null;

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", parsed.data.phone)
    .maybeSingle();

  const basePayload: Record<string, unknown> = {
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
    ...getLeadStatusPayload(parsed.data.enquiry_status || LEAD_STATUS.newLead),
    advisor_id: resolvedAdvisorId ?? null,
    source_advisor_id: parsed.data.source_advisor_id || null,
  };

  let customerId = existing?.id;

  if (customerId) {
    const { error } = await supabase.from("customers").update(basePayload).eq("id", customerId);
    if (error) return { success: false, error: error.message };
  } else {
    const { data: inserted, error } = await supabase
      .from("customers")
      .insert(basePayload)
      .select("id")
      .single();

    if (error || !inserted) return { success: false, error: error?.message || "Failed to create" };
    customerId = inserted.id;
  }

  if (parsed.data.project_id && customerId) {
    await supabase
      .from("customer_project_interests")
      .upsert(
        { customer_id: customerId, project_id: parsed.data.project_id },
        { onConflict: "customer_id,project_id" },
      );
  }

  revalidatePath("/enquiries");
  revalidatePath("/advisor/enquiries");
  revalidatePath("/customers");
  revalidatePath("/advisor/customers");

  return { success: true, customerId };
}

export async function updateEnquiryCustomer(
  id: string,
  values: EnquiryCustomerFormValues,
): Promise<ActionResponse> {
  const parsed = enquiryCustomerSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database connection failed" };

  const { user, role, advisorId } = await getScopeContext(supabase as any);
  if (!user) return { success: false, error: "Unauthorized" };

  const payload: Record<string, unknown> = {
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
    ...getLeadStatusPayload(parsed.data.enquiry_status || LEAD_STATUS.newLead),
    source_advisor_id: parsed.data.source_advisor_id || null,
  };

  if (role === "advisor") {
    payload.advisor_id = advisorId ?? null;
  } else if (parsed.data.advisor_id !== undefined) {
    payload.advisor_id = parsed.data.advisor_id || null;
  }

  let query = supabase.from("customers").update(payload).eq("id", id);
  if (role === "advisor") {
    if (!advisorId) return { success: false, error: "Advisor context missing" };
    query = query.eq("advisor_id", advisorId);
  }

  const { error } = await query;
  if (error) return { success: false, error: error.message };

  if (parsed.data.project_id) {
    await supabase
      .from("customer_project_interests")
      .upsert(
        { customer_id: id, project_id: parsed.data.project_id },
        { onConflict: "customer_id,project_id" },
      );
  }

  revalidatePath("/enquiries");
  revalidatePath("/advisor/enquiries");
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/advisor/customers");
  return { success: true };
}

export async function upgradeEnquiryToCustomer(opts: { enquiryId: string }): Promise<ActionResponse> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database connection failed" };

  const { user, role } = await getScopeContext(supabase);
  if (!user) return { success: false, error: "Unauthorized" };
  if (role === "advisor") return { success: false, error: "Only admins can close an enquiry as won." };

  const { error } = await supabase
    .from("customers")
    .update({
      lead_status: LEAD_STATUS.closedWon,
      is_active: true,
      won_at: new Date().toISOString(),
      lost_at: null,
    })
    .eq("id", opts.enquiryId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/enquiries");
  revalidatePath("/customers");
  revalidatePath("/advisor/customers");
  revalidatePath("/reports");
  return { success: true };
}

export async function markLeadAsLost(enquiryId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database connection failed" };

  const { user, role } = await getScopeContext(supabase);
  if (!user) return { success: false, error: "Unauthorized" };
  if (role === "advisor") return { success: false, error: "Only admins can close an enquiry as lost." };

  const { error } = await supabase
    .from("customers")
    .update({
      lead_status: LEAD_STATUS.closedLost,
      is_active: false,
      lost_at: new Date().toISOString(),
    })
    .eq("id", enquiryId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/enquiries");
  revalidatePath("/customers");
  revalidatePath("/advisor/customers");
  return { success: true };
}

export async function getTempCustomersByPhone(_phone: string): Promise<any[]> {
  return [];
}

export async function getEnquiryTempCustomersForModal(): Promise<any[]> {
  return [];
}

export async function getEnquiryLinkedCustomers(_enquiryId: string): Promise<any[]> {
  return [];
}

export async function upgradeTempCustomerToCustomer(opts: { customerId: string }): Promise<ActionResponse> {
  return upgradeEnquiryToCustomer({ enquiryId: opts.customerId });
}
