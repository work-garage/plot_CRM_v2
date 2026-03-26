"use server";

import { createClient } from "@/lib/supabase/server";
import { getScopeContext } from "@/lib/server/scope";
import { isClosedLostStatus, isClosedWonStatus } from "@/lib/constants/lead-status";

export type ReportFilters = {
  startDate?: string;
  endDate?: string;
};

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function inRange(dateStr: string | null | undefined, start?: string, end?: string): boolean {
  if (!dateStr) return false;
  const date = toDateOnly(dateStr);
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export async function getReportStats(filters?: ReportFilters) {
  const supabase = await createClient();
  if (!supabase) return getEmptyReport();

  const start = filters?.startDate ? toDateOnly(filters.startDate) : undefined;
  const end = filters?.endDate ? toDateOnly(filters.endDate) : undefined;
  const { role, advisorId } = await getScopeContext(supabase as any);

  let salesQuery = supabase
    .from("plot_sales")
    .select(
      "id, customer_id, advisor_id, sold_by_admin, total_sale_amount, amount_paid, remaining_amount, created_at, plots(project_id, projects(id, name)), sale_phase"
    )
    .eq("is_cancelled", false);

  if (role === "advisor") {
    if (!advisorId) return getEmptyReport();
    salesQuery = salesQuery.eq("advisor_id", advisorId);
  }

  const { data: sales } = await salesQuery;
  const filteredSales = (sales ?? []).filter((sale: any) => (!start && !end) || inRange(sale.created_at ?? "", start, end));

  const totalSalesValue = filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.total_sale_amount ?? 0), 0);
  const totalRevenueCollected = filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.amount_paid ?? 0), 0);
  const totalOutstanding = filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.remaining_amount ?? 0), 0);

  let paymentsQuery = supabase
    .from("payments")
    .select("amount, payment_date, is_confirmed, sale_id")
    .eq("is_confirmed", true);

  if (role === "advisor") {
    const advisorSaleIds = filteredSales.map((sale: any) => sale.id);
    if (advisorSaleIds.length === 0) {
      paymentsQuery = paymentsQuery.eq("sale_id", "00000000-0000-0000-0000-000000000000");
    } else {
      paymentsQuery = paymentsQuery.in("sale_id", advisorSaleIds);
    }
  }

  const { data: payments } = await paymentsQuery;
  const filteredPayments = (payments ?? []).filter((payment: any) => (!start && !end) || inRange(payment.payment_date ?? "", start, end));

  let filteredExpenses: any[] = [];
  if (role !== "advisor") {
    const { data: expenses } = await supabase
      .from("office_expenses")
      .select("amount, expense_date, category");
    filteredExpenses = (expenses ?? []).filter((expense: any) => (!start && !end) || inRange(expense.expense_date ?? "", start, end));
  }

  const totalExpenses = filteredExpenses.reduce((sum: number, expense: any) => sum + Number(expense.amount ?? 0), 0);

  let advisorsQuery = supabase
    .from("advisors")
    .select("id, name, advisor_commissions(total_commission_amount, amount_paid)");
  if (role === "advisor" && advisorId) {
    advisorsQuery = advisorsQuery.eq("id", advisorId);
  }
  const { data: advisors } = await advisorsQuery;

  const { data: commissionPayments, error: commissionPaymentsErr } = await supabase
    .from("advisor_commission_payments")
    .select("extra_paid_amount, paid_date");

  const safeCommissionPayments =
    commissionPaymentsErr && (commissionPaymentsErr.message || "").toLowerCase().includes("extra_paid_amount")
      ? []
      : commissionPayments ?? [];

  const filteredCommissionPayments = safeCommissionPayments.filter((payment: any) => (!start && !end) || inRange(payment.paid_date ?? "", start, end));
  const totalExtraCommissionPaid = filteredCommissionPayments.reduce(
    (sum: number, payment: any) => sum + Number(payment.extra_paid_amount ?? 0),
    0,
  );

  const advisorPerformance = (advisors ?? []).map((advisor: any) => {
    const commissions = (advisor.advisor_commissions as any[]) || [];
    const total = commissions.reduce((sum, commission) => sum + Number(commission.total_commission_amount ?? 0), 0);
    const paid = commissions.reduce((sum, commission) => sum + Number(commission.amount_paid ?? 0), 0);
    return {
      name: advisor.name,
      totalCommission: total,
      paidCommission: paid,
      pending: total - paid,
    };
  });

  const { data: projects } = await supabase.from("projects").select("id, name, plots(id, status)");
  const projectStats = (projects ?? []).map((project: any) => {
    const plots = (project.plots as any[]) || [];
    const total = plots.length;
    const sold = plots.filter((plot: any) => ["sold", "agreement", "token"].includes(plot.status)).length;
    const available = plots.filter((plot: any) => plot.status === "available").length;
    const soldInPeriod = filteredSales.filter((sale: any) => (sale as any).plots?.project_id === project.id).length;
    return {
      name: project.name,
      total,
      sold,
      soldInPeriod,
      available,
    };
  });

  const revenueByProject: Record<string, number> = {};
  const revenueByPhase: Record<string, number> = {};
  for (const sale of filteredSales) {
    const projectName = (sale as any).plots?.projects?.name ?? "Unknown";
    revenueByProject[projectName] = (revenueByProject[projectName] ?? 0) + Number((sale as any).total_sale_amount ?? 0);

    const phase = (sale as any).sale_phase ?? "other";
    revenueByPhase[phase] = (revenueByPhase[phase] ?? 0) + Number((sale as any).total_sale_amount ?? 0);
  }

  const topAdvisorSales: Record<string, number> = {};
  const { data: salesWithAdvisor } = await supabase
    .from("plot_sales")
    .select("advisor_id, sold_by_admin, total_sale_amount, created_at, advisors(name)")
    .eq("is_cancelled", false);

  const filteredWithAdvisor = (salesWithAdvisor ?? []).filter((sale: any) => (!start && !end) || inRange(sale.created_at ?? "", start, end));
  for (const sale of filteredWithAdvisor) {
    if (role === "advisor" && advisorId && sale.advisor_id !== advisorId) continue;
    const advisorName = Array.isArray(sale.advisors)
      ? (sale.advisors[0] as any)?.name
      : (sale.advisors as any)?.name;
    const label = sale.sold_by_admin ? "Admin (Direct)" : advisorName ?? sale.advisor_id ?? "Unknown";
    topAdvisorSales[label] = (topAdvisorSales[label] ?? 0) + Number(sale.total_sale_amount ?? 0);
  }

  const expenseByCategory: Record<string, number> = {};
  for (const expense of filteredExpenses) {
    const category = expense.category ?? "misc";
    expenseByCategory[category] = (expenseByCategory[category] ?? 0) + Number(expense.amount ?? 0);
  }

  let customersQuery = supabase
    .from("customers")
    .select("id, advisor_id, lead_status, created_at, won_at, property_type, segment, is_active");
  if (role === "advisor") {
    if (!advisorId) return getEmptyReport();
    customersQuery = customersQuery.eq("advisor_id", advisorId);
  }
  const { data: customers } = await customersQuery;

  const visibleCustomers = customers ?? [];
  const closedWonCustomers = visibleCustomers.filter((customer: any) => isClosedWonStatus(customer.lead_status));
  const newCustomersInPeriod = closedWonCustomers.filter((customer: any) => inRange(customer.won_at ?? customer.created_at, start, end)).length;

  const convertedInPeriod = closedWonCustomers.filter((customer: any) => inRange(customer.won_at ?? customer.created_at, start, end));
  const convertedCustomerIds = new Set(convertedInPeriod.map((customer: any) => customer.id));
  const convertedSales = filteredSales.filter((sale: any) => convertedCustomerIds.has(sale.customer_id));
  const enquiryConvertedRevenue = convertedSales.reduce((sum: number, sale: any) => sum + Number(sale.total_sale_amount ?? 0), 0);

  const conversionCategoryCounts: Record<string, number> = {};
  for (const customer of convertedInPeriod) {
    const category = customer.property_type || customer.segment || "Other";
    conversionCategoryCounts[category] = (conversionCategoryCounts[category] ?? 0) + 1;
  }

  const baseLeadStats = {
    total: visibleCustomers.length,
    active: visibleCustomers.filter((customer: any) => !isClosedWonStatus(customer.lead_status) && !isClosedLostStatus(customer.lead_status)).length,
    won: visibleCustomers.filter((customer: any) => isClosedWonStatus(customer.lead_status)).length,
    lost: visibleCustomers.filter((customer: any) => isClosedLostStatus(customer.lead_status)).length,
  };

  const salesByMonth: Record<string, { count: number; value: number }> = {};
  for (const sale of filteredSales) {
    const month = String(sale.created_at ?? "").slice(0, 7);
    const previous = salesByMonth[month] ?? { count: 0, value: 0 };
    previous.count += 1;
    previous.value += Number(sale.total_sale_amount ?? 0);
    salesByMonth[month] = previous;
  }

  return {
    summary: {
      totalSalesValue,
      totalRevenueCollected,
      totalOutstanding,
      totalExpenses,
      netProfit: totalRevenueCollected - totalExpenses,
      salesCount: filteredSales.length,
      paymentsCount: filteredPayments.length,
      enquiryConvertedCustomers: convertedInPeriod.length,
      enquiryConvertedCustomersBoughtPlots: new Set(convertedSales.map((sale: any) => sale.customer_id)).size,
      enquiryConvertedRevenue,
      totalExtraCommissionPaid,
    },
    enquiryConversionTopCategories: Object.entries(conversionCategoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    baseLeadStats,
    advisorPerformance,
    projectStats,
    revenueByProject: Object.entries(revenueByProject).map(([name, value]) => ({ name, value })),
    revenueByPhase: Object.entries(revenueByPhase).map(([phase, value]) => ({ phase, value })),
    topAdvisors: Object.entries(topAdvisorSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    expenseByCategory: Object.entries(expenseByCategory).map(([category, value]) => ({ category, value })),
    collectionsVsOutstanding: {
      collected: totalRevenueCollected,
      outstanding: totalOutstanding,
      total: totalSalesValue,
    },
    newCustomersInPeriod,
    salesByMonth: Object.entries(salesByMonth)
      .map(([month, value]) => ({ month, ...value }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export async function getProjectAnalytics(projectId: string, filters?: ReportFilters) {
  const supabase = await createClient();
  if (!supabase) return null;
  const start = filters?.startDate ? toDateOnly(filters.startDate) : undefined;
  const end = filters?.endDate ? toDateOnly(filters.endDate) : undefined;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, location, layout_expense")
    .eq("id", projectId)
    .single();
  if (projectError || !project) return null;

  const { data: plots } = await supabase
    .from("plots")
    .select("id, plot_number, status, size_sqft, rate_per_sqft")
    .eq("project_id", projectId);

  const { role, advisorId } = await getScopeContext(supabase as any);

  const plotIds = (plots ?? []).map((plot: any) => plot.id);
  let salesQuery = supabase
    .from("plot_sales")
    .select("id, advisor_id, total_sale_amount, amount_paid, remaining_amount, sold_by_admin, advisors(name)")
    .in("plot_id", plotIds)
    .eq("is_cancelled", false);

  if (role === "advisor") {
    if (!advisorId) return null;
    salesQuery = salesQuery.eq("advisor_id", advisorId);
  }

  const { data: sales } = await salesQuery;
  const filteredSales = (sales ?? []).filter(
    (sale: any) => (!start && !end) || inRange(sale.created_at ?? "", start, end),
  );

  const advisorSales: Record<string, number> = {};
  for (const sale of filteredSales) {
    const label = (sale as any).sold_by_admin ? "Admin (Direct)" : (sale as any).advisors?.name ?? "Unknown";
    advisorSales[label] = (advisorSales[label] ?? 0) + Number((sale as any).total_sale_amount ?? 0);
  }

  const { data: commissions } = filteredSales.length
    ? await supabase
        .from("advisor_commissions")
        .select("id, sale_id")
        .in("sale_id", filteredSales.map((sale: any) => sale.id))
    : { data: [] as any[] };

  let extraCommissionPaid = 0;
  if ((commissions ?? []).length > 0) {
    const { data: payments, error: paymentsError } = await supabase
      .from("advisor_commission_payments")
      .select("extra_paid_amount")
      .in("commission_id", (commissions ?? []).map((commission: any) => commission.id));
    const safePayments =
      paymentsError && (paymentsError.message || "").toLowerCase().includes("extra_paid_amount")
        ? []
        : payments ?? [];
    const filteredPayments = safePayments.filter(
      (payment: any) => (!start && !end) || inRange(payment.paid_date ?? "", start, end),
    );
    extraCommissionPaid = filteredPayments.reduce(
      (sum: number, payment: any) => sum + Number(payment.extra_paid_amount ?? 0),
      0,
    );
  }

  return {
    project: project as any,
    plots: {
      total: plots?.length ?? 0,
      sold: (plots ?? []).filter((plot: any) => ["sold", "agreement", "token"].includes(plot.status)).length,
      available: (plots ?? []).filter((plot: any) => plot.status === "available").length,
    },
    revenue: {
      total: filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.amount_paid ?? 0), 0),
      salesValue: filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.total_sale_amount ?? 0), 0),
      outstanding: filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.remaining_amount ?? 0), 0),
    },
    layoutExpense: Number((project as any).layout_expense ?? 0),
    extraCommissionPaid,
    advisors: Object.entries(advisorSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    topPlots: (plots ?? [])
      .filter((plot: any) => {
        if (plot.status === "available") return false;
        if (!start && !end) return true;
        const plotSale = filteredSales.find((sale: any) => sale.plot_id === plot.id);
        return Boolean(plotSale);
      })
      .map((plot: any) => ({
        plot_number: plot.plot_number,
        status: plot.status,
        value: Number(plot.size_sqft ?? 0) * Number(plot.rate_per_sqft ?? 0),
      }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10),
  };
}

function getEmptyReport() {
  return {
    summary: {
      totalSalesValue: 0,
      totalRevenueCollected: 0,
      totalOutstanding: 0,
      totalExpenses: 0,
      netProfit: 0,
      salesCount: 0,
      paymentsCount: 0,
      enquiryConvertedCustomers: 0,
      enquiryConvertedCustomersBoughtPlots: 0,
      enquiryConvertedRevenue: 0,
      totalExtraCommissionPaid: 0,
    },
    enquiryConversionTopCategories: [] as { category: string; count: number }[],
    baseLeadStats: {
      total: 0,
      active: 0,
      won: 0,
      lost: 0,
    },
    advisorPerformance: [] as { name: string; totalCommission: number; paidCommission: number; pending: number }[],
    projectStats: [] as { name: string; total: number; sold: number; soldInPeriod: number; available: number }[],
    revenueByProject: [] as { name: string; value: number }[],
    revenueByPhase: [] as { phase: string; value: number }[],
    topAdvisors: [] as { name: string; value: number }[],
    expenseByCategory: [] as { category: string; value: number }[],
    collectionsVsOutstanding: { collected: 0, outstanding: 0, total: 0 },
    newCustomersInPeriod: 0,
    salesByMonth: [] as { month: string; count: number; value: number }[],
  };
}
