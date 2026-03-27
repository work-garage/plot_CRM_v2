import { computePaymentDueMeta } from "@/lib/payment-due";
import { calculateCommissionFinance } from "@/lib/utils/commission-finance";

function toSafeNumber(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getProjectNode(plot: any) {
  return plot?.projects ?? null;
}

function getPlotSize(plot: any): number {
  return Math.max(0, toSafeNumber(plot?.size_sqft));
}

function getPlotBaseRate(plot: any): number {
  return Math.max(0, toSafeNumber(plot?.rate_per_sqft));
}

function deriveAdvisorRatePerSqft(sale: any, plot: any): number {
  const stored = Math.max(0, toSafeNumber(sale?.advisor_rate_per_sqft));
  if (stored > 0) return stored;
  if (sale?.sold_by_admin) return getPlotBaseRate(plot);
  const size = getPlotSize(plot);
  const total = Math.max(0, toSafeNumber(sale?.total_sale_amount));
  if (size > 0 && total > 0) return total / size;
  return 0;
}

export function normalizeSaleRecord<T extends Record<string, any>>(
  sale: T,
  lastConfirmedPaymentDate?: string | null,
): T & {
  plot_base_total: number;
  advisor_rate_per_sqft: number;
  collection_ratio: number;
  profit_total: number;
  eligible_commission_amount: number;
  remaining_commission: number;
  remaining_commission_overall: number;
  advisor_total_paid: number;
  advisor_extra_paid: number;
  payment_due_meta: ReturnType<typeof computePaymentDueMeta>;
} {
  const plot = sale?.plots ?? null;
  const plotSize = getPlotSize(plot);
  const plotBaseRate = getPlotBaseRate(plot);
  const plotBaseTotal = plotSize * plotBaseRate;
  const totalSaleAmount = Math.max(0, toSafeNumber(sale?.total_sale_amount));
  const amountPaid = Math.max(0, toSafeNumber(sale?.amount_paid));
  const remainingAmount = Math.max(
    0,
    sale?.remaining_amount == null
      ? totalSaleAmount - amountPaid
      : toSafeNumber(sale?.remaining_amount),
  );
  const advisorRatePerSqft = deriveAdvisorRatePerSqft(sale, plot);
  const advisorPaid = Math.max(
    0,
    toSafeNumber(
      sale?.advisor_commissions?.amount_paid ??
        sale?.advisor_commissions?.[0]?.amount_paid ??
        sale?.advisor_total_paid,
    ),
  );

  const commission =
    sale?.sold_by_admin
      ? {
          profitTotal: 0,
          eligibleNow: 0,
          remainingEligible: 0,
          remainingOverall: 0,
          extraPaid: 0,
          collectionRatio: totalSaleAmount > 0 ? Math.min(1, amountPaid / totalSaleAmount) : 0,
        }
      : calculateCommissionFinance({
          saleTotalAmount: totalSaleAmount,
          saleAmountPaid: amountPaid,
          plotSizeSqft: plotSize,
          plotBaseRatePerSqft: plotBaseRate,
          advisorAmountPaid: advisorPaid,
          storedTotalCommissionAmount:
            sale?.advisor_commissions?.total_commission_amount ??
            sale?.advisor_commissions?.[0]?.total_commission_amount,
        });

  const paymentDueMeta = computePaymentDueMeta(
    {
      remaining_amount: remainingAmount,
      monthly_emi: sale?.monthly_emi,
      emi_day: sale?.emi_day,
      token_date: sale?.token_date ?? null,
      agreement_date: sale?.agreement_date ?? null,
      followup_date: sale?.followup_date ?? null,
    },
    lastConfirmedPaymentDate ?? null,
  );

  return {
    ...sale,
    plots: plot
      ? {
          ...plot,
          projects: getProjectNode(plot),
        }
      : plot,
    amount_paid: amountPaid,
    remaining_amount: remainingAmount,
    advisor_rate_per_sqft: advisorRatePerSqft,
    plot_base_total: plotBaseTotal,
    collection_ratio: commission.collectionRatio,
    profit_total: commission.profitTotal,
    eligible_commission_amount: commission.eligibleNow,
    remaining_commission: commission.remainingEligible,
    remaining_commission_overall: commission.remainingOverall,
    advisor_total_paid: advisorPaid,
    advisor_extra_paid: commission.extraPaid,
    payment_due_meta: paymentDueMeta,
  };
}

export function normalizeSaleRecords<T extends Record<string, any>>(
  sales: T[],
  lastBySale: Record<string, string> = {},
) {
  return sales.map((sale) => normalizeSaleRecord(sale, lastBySale[sale.id] ?? null));
}
