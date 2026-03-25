"use server";

import { createClient } from "@/lib/supabase/server";

export type ReportFilters = {
	startDate?: string; // ISO date YYYY-MM-DD
	endDate?: string;   // ISO date YYYY-MM-DD
};

function toDateOnly(iso: string): string {
	return iso.slice(0, 10);
}

function inRange(dateStr: string, start?: string, end?: string): boolean {
	if (!start && !end) return true;
	const d = toDateOnly(dateStr);
	if (start && d < start) return false;
	if (end && d > end) return false;
	return true;
}

export async function getReportStats(filters?: ReportFilters) {
	const supabase = await createClient();
	if (!supabase) {
		return getEmptyReport();
	}

	const start = filters?.startDate ? toDateOnly(filters.startDate) : undefined;
	const end = filters?.endDate ? toDateOnly(filters.endDate) : undefined;

	// 1. Sales
	const { data: sales } = await supabase
		.from("plot_sales")
		.select("id, customer_id, total_sale_amount, amount_paid, remaining_amount, created_at, plots(project_id, projects(id, name)), sale_phase")
		.eq("is_cancelled", false);

	const filteredSales = (sales ?? []).filter((s: any) => inRange(s.created_at ?? "", start, end));

	const totalSalesValue = filteredSales.reduce((sum, s) => sum + Number(s.total_sale_amount ?? 0), 0);
	const totalRevenueCollected = filteredSales.reduce((sum, s) => sum + Number(s.amount_paid ?? 0), 0);
	const totalOutstanding = filteredSales.reduce((sum, s) => sum + Number(s.remaining_amount ?? 0), 0);

	// 2. Payments (for collections timeline)
	const { data: payments } = await supabase
		.from("payments")
		.select("amount, payment_date, is_confirmed")
		.eq("is_confirmed", true);

	const filteredPayments = (payments ?? []).filter((p: any) => inRange(p.payment_date ?? "", start, end));
	const totalPaymentsCollected = filteredPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

	// 3. Expenses
	const { data: expenses } = await supabase
		.from("office_expenses")
		.select("amount, expense_date, category");

	const filteredExpenses = (expenses ?? []).filter((e: any) => inRange(e.expense_date ?? "", start, end));
	const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

	// 4. Advisor commissions
	const { data: advisors } = await supabase
		.from("advisors")
		.select("id, name, advisor_commissions(total_commission_amount, amount_paid)");

	const { data: commissionPayments, error: commissionPaymentsErr } = await supabase
		.from("advisor_commission_payments")
		.select("extra_paid_amount, paid_date");
	const safeCommissionPayments =
		commissionPaymentsErr &&
		(commissionPaymentsErr.message || "").toLowerCase().includes("extra_paid_amount")
			? []
			: commissionPayments ?? [];

	const filteredCommissionPayments = safeCommissionPayments.filter((p: any) =>
		inRange(p.paid_date ?? "", start, end)
	);
	const totalExtraCommissionPaid = filteredCommissionPayments.reduce(
		(sum, p: any) => sum + Number(p.extra_paid_amount ?? 0),
		0
	);

	const advisorPerformance = (advisors ?? []).map((a: any) => {
		const comms = (a.advisor_commissions as any[]) || [];
		const total = comms.reduce((s, c) => s + Number(c.total_commission_amount ?? 0), 0);
		const paid = comms.reduce((s, c) => s + Number(c.amount_paid ?? 0), 0);
		return {
			name: a.name,
			totalCommission: total,
			paidCommission: paid,
			pending: total - paid,
		};
	});

	// 5. Project stats
	const { data: projects } = await supabase
		.from("projects")
		.select("id, name, plots(id, status)");

	const projectStats = (projects ?? []).map((p: any) => {
		const plots = (p.plots as any[]) || [];
		const total = plots.length;
		const sold = plots.filter((pl: any) => pl.status === "sold" || pl.status === "agreement" || pl.status === "token").length;
		const available = plots.filter((pl: any) => pl.status === "available").length;
		const soldInPeriod = filteredSales.filter((s: any) =>
			(s as any).plots?.project_id === p.id || (s as any).plots?.projects?.id === p.id
		).length;
		return {
			name: p.name,
			total,
			sold,
			soldInPeriod,
			available,
		};
	});

	// 6. Revenue by project (in period)
	const revenueByProject: Record<string, number> = {};
	for (const s of filteredSales) {
		const proj = (s as any).plots?.projects?.name ?? "Unknown";
		revenueByProject[proj] = (revenueByProject[proj] ?? 0) + Number((s as any).total_sale_amount ?? 0);
	}

	// 7. Revenue by sale phase
	const revenueByPhase: Record<string, number> = {};
	for (const s of filteredSales) {
		const phase = (s as any).sale_phase ?? "other";
		revenueByPhase[phase] = (revenueByPhase[phase] ?? 0) + Number((s as any).total_sale_amount ?? 0);
	}

	// 8. Top advisors by sales value (includes "Admin (Direct)" for sold_by_admin)
	const advisorSales: Record<string, number> = {};
	const { data: salesWithAdvisor } = await supabase
		.from("plot_sales")
		.select("advisor_id, sold_by_admin, total_sale_amount, created_at, advisors(name)")
		.eq("is_cancelled", false);

	const filteredWithAdvisor = (salesWithAdvisor ?? []).filter((s: any) => inRange(s.created_at ?? "", start, end));
	for (const s of filteredWithAdvisor) {
		const name =
			(s as any).sold_by_admin
				? "Admin (Direct)"
				: (s as any).advisors?.name ?? (s as any).advisor_id ?? "Unknown";
		advisorSales[name] = (advisorSales[name] ?? 0) + Number((s as any).total_sale_amount ?? 0);
	}

	const topAdvisors = Object.entries(advisorSales)
		.map(([name, val]) => ({ name, value: val }))
		.sort((a, b) => b.value - a.value)
		.slice(0, 10);

	// 9. Expense by category
	const expenseByCategory: Record<string, number> = {};
	for (const e of filteredExpenses) {
		const cat = (e as any).category ?? "misc";
		expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number((e as any).amount ?? 0);
	}

	// 10. Collections vs outstanding
	const collectionsVsOutstanding = {
		collected: totalRevenueCollected,
		outstanding: totalOutstanding,
		total: totalSalesValue,
	};

	// 11. Customer count (new in period)
	const { data: customers } = await supabase
		.from("customers")
		.select("created_at");

	const newCustomersInPeriod = (customers ?? []).filter((c: any) => inRange(c.created_at ?? "", start, end)).length;

	// 12. Enquiry conversions (temporary -> regular)
	const { data: enquiryUpgradedCustomers } = await supabase
		.from("customers")
		.select("id, upgraded_from_enquiry_id, upgraded_from_enquiry_at");

	const upgradedInPeriod = (enquiryUpgradedCustomers ?? []).filter(
		(c: any) =>
			!!c.upgraded_from_enquiry_id && inRange(c.upgraded_from_enquiry_at ?? "", start, end)
	);

	const upgradedCustomerIds = new Set(upgradedInPeriod.map((c: any) => c.id));
	const convertedSales = filteredSales.filter(
		(s: any) => !!s.customer_id && upgradedCustomerIds.has(s.customer_id)
	);
	const boughtUpgradedCustomerIds = new Set(
		convertedSales.map((s: any) => s.customer_id)
	);

	// 12b. Enquiry category breakdown (from upgraded customers)
	const enquiryIds = upgradedInPeriod
		.map((c: any) => c.upgraded_from_enquiry_id)
		.filter(Boolean);
	const categoryCounts: Record<string, number> = {};
	if (enquiryIds.length > 0) {
		const { data: upgradedEnquiries } = await supabase
			.from("enquiry_customers")
			.select("id, category")
			.in("id", enquiryIds);

		for (const e of upgradedEnquiries ?? []) {
			const cat = (e as any).category ?? "other";
			categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
		}
	}

	const enquiryConvertedRevenue = convertedSales.reduce(
		(sum, s: any) => sum + Number(s.total_sale_amount ?? 0),
		0
	);

	// 13. Sale count by month (for trend)
	const salesByMonth: Record<string, { count: number; value: number }> = {};
	for (const s of filteredSales) {
		const dt = (s as any).created_at ?? "";
		const month = dt.slice(0, 7);
		const prev = salesByMonth[month] ?? { count: 0, value: 0 };
		prev.count += 1;
		prev.value += Number((s as any).total_sale_amount ?? 0);
		salesByMonth[month] = prev;
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
			enquiryConvertedCustomers: upgradedInPeriod.length,
			enquiryConvertedCustomersBoughtPlots: boughtUpgradedCustomerIds.size,
			enquiryConvertedRevenue,
			totalExtraCommissionPaid,
		},
		enquiryConversionTopCategories: Object.entries(categoryCounts)
			.map(([category, count]) => ({ category, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5),
		advisorPerformance,
		projectStats,
		revenueByProject: Object.entries(revenueByProject).map(([name, v]) => ({ name, value: v })),
		revenueByPhase: Object.entries(revenueByPhase).map(([phase, v]) => ({ phase, value: v })),
		topAdvisors,
		expenseByCategory: Object.entries(expenseByCategory).map(([cat, v]) => ({ category: cat, value: v })),
		collectionsVsOutstanding,
		newCustomersInPeriod,
		salesByMonth: Object.entries(salesByMonth)
			.map(([month, v]) => ({ month, ...v }))
			.sort((a, b) => a.month.localeCompare(b.month)),
	};
}

export async function getProjectAnalytics(projectId: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data: project, error: projErr } = await supabase
		.from("projects")
		.select("id, name, location, layout_expense")
		.eq("id", projectId)
		.single();

	if (projErr || !project) return null;

	const { data: plots } = await supabase
		.from("plots")
		.select("id, plot_number, status, size_sqft, rate_per_sqft")
		.eq("project_id", projectId);

	const plotIds = (plots ?? []).map((p: any) => p.id);
	const total = plots?.length ?? 0;
	const sold = (plots ?? []).filter(
		(p: any) => p.status === "sold" || p.status === "agreement" || p.status === "token"
	).length;
	const available = (plots ?? []).filter((p: any) => p.status === "available").length;

	const { data: sales } = await supabase
		.from("plot_sales")
		.select("id, total_sale_amount, amount_paid, remaining_amount, sold_by_admin, advisors(name)")
		.in("plot_id", plotIds)
		.eq("is_cancelled", false);

	const totalRevenue = (sales ?? []).reduce((sum: number, s: any) => sum + Number(s.amount_paid ?? 0), 0);
	const totalSalesValue = (sales ?? []).reduce((sum: number, s: any) => sum + Number(s.total_sale_amount ?? 0), 0);
	const outstanding = (sales ?? []).reduce((sum: number, s: any) => sum + Number(s.remaining_amount ?? 0), 0);

	const advisorSales: Record<string, number> = {};
	for (const s of sales ?? []) {
		const name = (s as any).sold_by_admin ? "Admin (Direct)" : (s as any).advisors?.name ?? "Unknown";
		advisorSales[name] = (advisorSales[name] ?? 0) + Number((s as any).total_sale_amount ?? 0);
	}
	const advisorsInProject = Object.entries(advisorSales)
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);

	const topPlots = (plots ?? [])
		.filter((p: any) => p.status !== "available")
		.map((p: any) => ({
			plot_number: p.plot_number,
			status: p.status,
			value: Number(p.size_sqft ?? 0) * Number(p.rate_per_sqft ?? 0),
		}))
		.sort((a: any, b: any) => b.value - a.value)
		.slice(0, 10);

	const { data: comms } = await supabase
		.from("advisor_commissions")
		.select("id, sale_id")
		.in("sale_id", (sales ?? []).map((s: any) => s.id));
	const commissionIds = (comms ?? []).map((c: any) => c.id);

	let extraCommissionPaid = 0;
	if (commissionIds.length > 0) {
		const { data: commPayments, error: commPaymentsErr } = await supabase
			.from("advisor_commission_payments")
			.select("extra_paid_amount")
			.in("commission_id", commissionIds);
		const safeCommPayments =
			commPaymentsErr &&
			(commPaymentsErr.message || "").toLowerCase().includes("extra_paid_amount")
				? []
				: commPayments ?? [];
		extraCommissionPaid = safeCommPayments.reduce(
			(sum: number, p: any) => sum + Number(p.extra_paid_amount ?? 0),
			0
		);
	}

	return {
		project: project as any,
		plots: { total, sold, available },
		revenue: { total: totalRevenue, salesValue: totalSalesValue, outstanding },
		layoutExpense: Number((project as any).layout_expense ?? 0),
		extraCommissionPaid,
		advisors: advisorsInProject,
		topPlots,
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
