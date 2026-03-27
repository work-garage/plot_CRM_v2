"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeSaleRecord } from "@/lib/utils/sale-normalization";

export async function getEmiSales() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: sales, error } = await supabase
		.from("plot_sales")
		.select(
			`
      id,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      monthly_emi,
      emi_day,
      token_date,
      agreement_date,
      sold_by_admin,
      advisor_rate_per_sqft,
      followup_date,
      plots(plot_number, size_sqft, rate_per_sqft, projects(name)),
      customers(id, name, phone),
      advisors(name)
    `
		)
		.not("monthly_emi", "is", null)
		.eq("is_cancelled", false)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);

	// Get last payment date per sale for next EMI due
	const saleIds = (sales ?? []).map((s: any) => s.id);
	const { data: lastPayments } = await supabase
		.from("payments")
		.select("sale_id, payment_date")
		.in("sale_id", saleIds)
		.eq("is_confirmed", true)
		.order("payment_date", { ascending: false });

	const lastBySale: Record<string, string> = {};
	for (const p of lastPayments ?? []) {
		const sid = (p as any).sale_id;
		if (!lastBySale[sid]) lastBySale[sid] = (p as any).payment_date;
	}

	const result = (sales ?? []).map((s: any) => {
    const normalized = normalizeSaleRecord(s, lastBySale[s.id] ?? null);
    return {
      ...normalized,
      next_emi_due: normalized.payment_due_meta?.next_emi_due ?? null,
      is_emi_due_today:
        normalized.payment_due_meta?.next_emi_due === new Date().toISOString().slice(0, 10) &&
        Number(normalized.remaining_amount ?? 0) > 0,
    };
	});

	return result.filter((s: any) => Number(s.remaining_amount ?? 0) > 0);
}
