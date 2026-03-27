import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui";
import { AdvisorAnalyticsTable } from "@/components/advisors/advisor-analytics-table";
import { calculateCommissionFinance } from "@/lib/utils/commission-finance";

export default async function AdvisorsAnalyticsPage() {
	const supabase = await createClient();
	if (!supabase) {
		return (
			<div className="p-8 text-center text-zinc-500">
				Database connection failed
			</div>
		);
	}

	const { data: advisors } = await supabase
		.from("advisors")
		.select("id, name, code, phone, is_active")
		.order("name", { ascending: true });

	const advisorIds = (advisors ?? []).map((a) => a.id);

	const { data: sales } = advisorIds.length
		? await supabase
				.from("plot_sales")
				.select("advisor_id, total_sale_amount, remaining_amount")
				.in("advisor_id", advisorIds)
				.eq("is_cancelled", false)
		: { data: [] as any[] };

	const { data: comms } = advisorIds.length
		? await supabase
				.from("advisor_commissions")
				.select("advisor_id, remaining_commission, amount_paid, total_commission_amount, plot_sales(total_sale_amount, amount_paid, plots(size_sqft, rate_per_sqft))")
				.in("advisor_id", advisorIds)
		: { data: [] as any[] };

	const salesAgg: Record<string, { salesCount: number; revenue: number; due: number }> = {};
	for (const s of sales ?? []) {
		const id = (s as any).advisor_id as string;
		const prev = salesAgg[id] ?? { salesCount: 0, revenue: 0, due: 0 };
		prev.salesCount += 1;
		prev.revenue += Number((s as any).total_sale_amount ?? 0);
		prev.due += Number((s as any).remaining_amount ?? 0);
		salesAgg[id] = prev;
	}

	const commAgg: Record<string, { pending: number; paid: number; total: number }> = {};
	for (const c of comms ?? []) {
		const id = (c as any).advisor_id as string;
		const prev = commAgg[id] ?? { pending: 0, paid: 0, total: 0 };
    const snapshot = calculateCommissionFinance({
      saleTotalAmount: (c as any).plot_sales?.total_sale_amount,
      saleAmountPaid: (c as any).plot_sales?.amount_paid,
      plotSizeSqft: (c as any).plot_sales?.plots?.size_sqft,
      plotBaseRatePerSqft: (c as any).plot_sales?.plots?.rate_per_sqft,
      advisorAmountPaid: (c as any).amount_paid,
      storedTotalCommissionAmount: (c as any).total_commission_amount,
    });
		prev.pending += snapshot.remainingEligible;
		prev.paid += Number((c as any).amount_paid ?? 0);
		prev.total += snapshot.profitTotal;
		commAgg[id] = prev;
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Advisor Analytics"
				subtitle="Sales, dues, and commission status by advisor. Click a row for details."
				action={
					<Link href="/advisors">
						<Button size="sm" variant="outline">
							Manage Advisors
						</Button>
					</Link>
				}
			/>

			<AdvisorAnalyticsTable
				advisors={(advisors ?? []).map((a: any) => ({
					id: a.id,
					name: a.name,
					code: a.code,
					phone: a.phone,
					is_active: a.is_active,
				}))}
				salesAgg={salesAgg}
				commAgg={commAgg}
			/>
		</div>
	);
}
