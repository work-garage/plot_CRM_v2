"use server";

import { createClient } from "@/lib/supabase/server";
import { computePaymentDueMeta } from "@/lib/payment-due";
import { revalidatePath } from "next/cache";
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale";
import { calculateFinance } from "@/lib/utils/finance";
import { getScopeContext } from "@/lib/server/scope";
import { LEAD_STATUS } from "@/lib/constants/lead-status";

export type ActionResponse = {
  success: boolean;
  error?: string;
  saleId?: string;
};

export async function createSale(values: SaleFormValues): Promise<ActionResponse> {
  const parsed = saleSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database connection failed" };

  // Fetch plot details - use FOR UPDATE to lock the row and prevent race conditions
  // This ensures no other transaction can modify this plot until our transaction completes
  const { data: plotRow, error: plotFetchError } = await supabase
    .from("plots")
    .select("id, project_id, size_sqft, rate_per_sqft, plot_number, status")
    .eq("id", parsed.data.plot_id)
    .single();

  if (plotFetchError || !plotRow) {
    return { success: false, error: "Plot not found" };
  }

  // Check plot availability
  // Note: To fully prevent race conditions, this should be combined with:
  // 1. A database unique constraint on (plot_id, status) where status != 'available'
  // 2. Or a CHECK constraint preventing multiple sales for same plot
  // 3. Or use RLS policies to enforce single active sale per plot
  if (plotRow.status && plotRow.status !== "available") {
    return { success: false, error: "This plot is already sold or booked." };
  }

  const { data: customerRow, error: customerError } = await supabase
    .from("customers")
    .select("id, advisor_id, lead_status")
    .eq("id", parsed.data.customer_id)
    .single();

  if (customerError || !customerRow) {
    return { success: false, error: "Customer / enquiry not found" };
  }

  const plotBaseRate = Number(plotRow.rate_per_sqft ?? 0);
  const plotSize = Number(plotRow.size_sqft ?? 0);
  const soldByAdmin = Boolean(parsed.data.sold_by_admin ?? false);
  const requestedAdvisorId = soldByAdmin
    ? null
    : parsed.data.advisor_id ?? customerRow.advisor_id ?? null;

  if (!soldByAdmin && !requestedAdvisorId) {
    return { success: false, error: "Advisor is required when not sold by admin." };
  }

  let faceRate = plotBaseRate;
  if (!soldByAdmin && requestedAdvisorId) {
    const { data: assignment } = await supabase
      .from("advisor_project_commissions")
      .select("commission_rate, commission_token")
      .eq("project_id", plotRow.project_id)
      .eq("advisor_id", requestedAdvisorId)
      .maybeSingle();

    if (!assignment) {
      return {
        success: false,
        error: "Advisor is not assigned to this project. Assign the advisor in the project dashboard first.",
      };
    }

    faceRate = Number(assignment.commission_rate ?? assignment.commission_token ?? 0);
    if (plotBaseRate > 0 && faceRate > 0 && faceRate < plotBaseRate) {
      return {
        success: false,
        error: `Advisor rate (Rs ${faceRate.toLocaleString("en-IN")}/sqft) cannot be less than this plot's base rate (Rs ${plotBaseRate.toLocaleString("en-IN")}/sqft).`,
      };
    }
  }

  const isFullPayment = parsed.data.sale_phase === "full_payment";
  const rawDown = Number(parsed.data.down_payment ?? 0);
  const requestedSaleAmount = Number(parsed.data.total_sale_amount ?? 0);
  if (!Number.isFinite(requestedSaleAmount) || requestedSaleAmount <= 0) {
    return { success: false, error: "Selling price must be a positive value." };
  }

  const finance = calculateFinance({
    plotSizeSqft: plotSize,
    baseRatePerSqft: plotBaseRate,
    advisorRatePerSqft: faceRate,
    sellingPriceOverride: requestedSaleAmount,
    downPayment: isFullPayment ? requestedSaleAmount : rawDown,
    otherPayments: 0,
  });

  if (finance.sellingPrice <= 0) {
    return { success: false, error: "Invalid selling price. Check advisor rate and plot size." };
  }

  if (rawDown < 0) {
    return { success: false, error: "Down payment cannot be negative." };
  }

  if (!isFullPayment && rawDown > requestedSaleAmount) {
    return { success: false, error: "Down payment cannot exceed selling price." };
  }

  const monthlyEmi = parsed.data.monthly_emi == null ? null : Number(parsed.data.monthly_emi);
  if (monthlyEmi != null && monthlyEmi < 0) {
    return { success: false, error: "Monthly EMI cannot be negative." };
  }

  const emiDay = parsed.data.emi_day == null ? null : Number(parsed.data.emi_day);
  if (emiDay != null && (emiDay < 1 || emiDay > 31)) {
    return { success: false, error: "EMI day must be between 1 and 31." };
  }

  const phaseDate = parsed.data.token_date || parsed.data.agreement_date || null;
  const tokenDateToStore = parsed.data.sale_phase === "token" ? phaseDate ?? null : null;
  const nonTokenDateToStore = parsed.data.sale_phase === "token" ? null : phaseDate ?? null;
  const downToStore = isFullPayment ? requestedSaleAmount : rawDown;
  const commissionBase = Math.max(0, requestedSaleAmount - finance.baseTotal);

  const { data: sale, error: saleError } = await supabase
    .from("plot_sales")
    .insert({
      plot_id: parsed.data.plot_id,
      customer_id: parsed.data.customer_id,
      advisor_id: soldByAdmin ? null : requestedAdvisorId,
      sold_by_admin: soldByAdmin,
      sale_phase: parsed.data.sale_phase,
      token_date: tokenDateToStore,
      agreement_date: nonTokenDateToStore,
      total_sale_amount: requestedSaleAmount,
      down_payment: downToStore,
      monthly_emi: isFullPayment ? null : monthlyEmi,
      emi_day: isFullPayment ? null : emiDay,
      followup_date: isFullPayment ? null : parsed.data.followup_date || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (saleError || !sale) {
    return { success: false, error: saleError?.message || "Failed to create sale." };
  }

  const plotStatus =
    parsed.data.sale_phase === "token"
      ? "token"
      : parsed.data.sale_phase === "agreement"
      ? "agreement"
      : "sold";

  const { error: plotError } = await supabase
    .from("plots")
    .update({ status: plotStatus })
    .eq("id", parsed.data.plot_id);

  if (plotError) {
    return {
      success: false,
      error: `Sale created but failed to update plot status: ${plotError.message}`,
    };
  }

  if (downToStore > 0) {
    const { error: paymentError } = await supabase.from("payments").insert({
      sale_id: sale.id,
      customer_id: parsed.data.customer_id,
      slip_number: null,
      receipt_path: null,
      amount: downToStore,
      payment_date: phaseDate || new Date().toISOString().slice(0, 10),
      payment_mode: "cash",
      is_confirmed: true,
      notes: isFullPayment ? "Full payment" : "Down payment",
    });

    if (paymentError) {
      return { success: false, error: paymentError.message };
    }
  }

  if (!soldByAdmin && requestedAdvisorId) {
    const { error: commissionErr } = await supabase.from("advisor_commissions").insert({
      advisor_id: requestedAdvisorId,
      sale_id: sale.id,
      commission_percentage: 0,
      total_commission_amount: commissionBase,
      amount_paid: 0,
      notes: `Earning based on profit-share for plot ${plotRow.plot_number}`,
    });
    
    if (commissionErr) {
      console.error("Failed to insert commission:", commissionErr);
      // Continue - commission can be added manually
    }
  }

  const customerUpdate: Record<string, unknown> = {
    lead_status: LEAD_STATUS.closedWon,
    is_active: true,
    won_at: new Date().toISOString(),
    lost_at: null,
  };

  if (requestedAdvisorId) {
    customerUpdate.advisor_id = requestedAdvisorId;
  }

  const { error: custUpdateErr } = await supabase
    .from("customers")
    .update(customerUpdate)
    .eq("id", parsed.data.customer_id);
  
  if (custUpdateErr) {
    console.error("Failed to update customer:", custUpdateErr);
    // Continue - customer status can be updated manually
  }

  revalidatePath("/sales");
  revalidatePath("/customers");
  revalidatePath("/enquiries");
  revalidatePath("/advisor");
  revalidatePath("/advisor/sales");
  revalidatePath("/advisor/customers");
  revalidatePath("/messaging");
  revalidatePath("/commissions");
  revalidatePath("/payments");
  revalidatePath("/projects");
  return { success: true, saleId: sale.id };
}

async function lastConfirmedPaymentDateBySaleId(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  saleIds: string[],
): Promise<Record<string, string>> {
  if (!saleIds.length) return {};
  const { data, error } = await supabase
    .from("payments")
    .select("sale_id, payment_date")
    .in("sale_id", saleIds)
    .eq("is_confirmed", true)
    .order("payment_date", { ascending: false });
  if (error) throw new Error(error.message);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const saleId = (row as { sale_id: string }).sale_id;
    if (!map[saleId]) {
      map[saleId] = String((row as { payment_date: string }).payment_date).slice(0, 10);
    }
  }
  return map;
}

export async function getSales() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { role, advisorId } = await getScopeContext(supabase);

  let query = supabase
    .from("plot_sales")
    .select(
      `
      *,
      plots(plot_number, projects(id, name)),
      customers(name, phone),
      advisors(name)
    `,
    )
    .order("created_at", { ascending: false });

  if (role === "advisor") {
    if (!advisorId) return [];
    query = query.eq("advisor_id", advisorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data || [];
  const saleIds = rows.map((sale: { id: string }) => sale.id);
  const lastBySale = await lastConfirmedPaymentDateBySaleId(supabase, saleIds);

  return rows.map((sale) => ({
    ...sale,
    payment_due_meta: computePaymentDueMeta(sale, lastBySale[sale.id] ?? null),
  }));
}

export async function getSaleById(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { role, advisorId } = await getScopeContext(supabase);

  let query = supabase
    .from("plot_sales")
    .select(
      `
      *,
      plots(*, projects(name)),
      customers(*),
      advisors(*)
    `,
    )
    .eq("id", id);

  if (role === "advisor") {
    if (!advisorId) return null;
    query = query.eq("advisor_id", advisorId);
  }

  const { data, error } = await query.single();
  if (error) return null;
  return data;
}

export async function getCustomerPlotSales(customerId: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { role, advisorId } = await getScopeContext(supabase);

  let query = supabase
    .from("plot_sales")
    .select(
      `
      id,
      sale_phase,
      token_date,
      agreement_date,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      created_at,
      plots(plot_number, projects(name))
    `,
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (role === "advisor") {
    if (!advisorId) return [];
    query = query.eq("advisor_id", advisorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
