"use server";

import { createClient } from "@/lib/supabase/server";

export type SalesConsistencyAudit = {
  inconsistentSaleAmounts: number;
  inconsistentSaleRemaining: number;
  inconsistentCommissionTotals: number;
  inconsistentCommissionRemaining: number;
};

export async function getSalesConsistencyAudit(): Promise<SalesConsistencyAudit | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const [{ data: sales, error: salesError }, { data: payments, error: paymentsError }, { data: commissions, error: commissionsError }] =
    await Promise.all([
      supabase
        .from("plot_sales")
        .select("id, total_sale_amount, amount_paid, remaining_amount, plot_id, is_cancelled")
        .eq("is_cancelled", false),
      supabase
        .from("payments")
        .select("sale_id, amount, is_confirmed"),
      supabase
        .from("advisor_commissions")
        .select("id, sale_id, total_commission_amount, amount_paid, remaining_commission, plot_sales(total_sale_amount, amount_paid, plots(size_sqft, rate_per_sqft))"),
    ]);

  if (salesError || paymentsError || commissionsError) return null;

  const confirmedPaidBySale = new Map<string, number>();
  for (const payment of payments ?? []) {
    if (!payment.is_confirmed) continue;
    confirmedPaidBySale.set(
      payment.sale_id,
      (confirmedPaidBySale.get(payment.sale_id) ?? 0) + Number(payment.amount ?? 0),
    );
  }

  let inconsistentSaleAmounts = 0;
  let inconsistentSaleRemaining = 0;
  for (const sale of sales ?? []) {
    const confirmedPaid = confirmedPaidBySale.get(sale.id) ?? 0;
    const storedPaid = Number(sale.amount_paid ?? 0);
    const storedRemaining = Number(sale.remaining_amount ?? 0);
    const expectedRemaining = Math.max(0, Number(sale.total_sale_amount ?? 0) - confirmedPaid);
    if (Math.abs(storedPaid - confirmedPaid) > 0.01) inconsistentSaleAmounts += 1;
    if (Math.abs(storedRemaining - expectedRemaining) > 0.01) inconsistentSaleRemaining += 1;
  }

  let inconsistentCommissionTotals = 0;
  let inconsistentCommissionRemaining = 0;
  for (const commission of commissions ?? []) {
    const sale = (commission as any).plot_sales;
    const saleTotal = Number(sale?.total_sale_amount ?? 0);
    const saleReceived = Number(sale?.amount_paid ?? 0);
    const plotSize = Number(sale?.plots?.size_sqft ?? 0);
    const plotBaseRate = Number(sale?.plots?.rate_per_sqft ?? 0);
    const derivedTotal = Math.max(0, saleTotal - plotSize * plotBaseRate);
    const derivedRemaining = Math.max(
      0,
      derivedTotal * (saleTotal > 0 ? Math.min(1, Math.max(0, saleReceived / saleTotal)) : 0) -
        Number(commission.amount_paid ?? 0),
    );
    if (Math.abs(Number(commission.total_commission_amount ?? 0) - derivedTotal) > 0.01) {
      inconsistentCommissionTotals += 1;
    }
    if (Math.abs(Number(commission.remaining_commission ?? 0) - derivedRemaining) > 0.01) {
      inconsistentCommissionRemaining += 1;
    }
  }

  return {
    inconsistentSaleAmounts,
    inconsistentSaleRemaining,
    inconsistentCommissionTotals,
    inconsistentCommissionRemaining,
  };
}
