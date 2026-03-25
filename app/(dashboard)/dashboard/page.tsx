import { Suspense } from "react";
import {
	BarChart3,
	TrendingUp,
	TrendingDown,
	Users,
	Building2,
	IndianRupee,
	PieChart,
	Wallet,
	Target,
	FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getReportStats } from "@/app/actions/reports";
import { formatCurrency } from "@/lib/utils/formatters";
import { ReportsFilters } from "@/components/reports/reports-filters";
import { SalesTrendLineChart } from "@/components/reports/sales-trend-line-chart";

export default async function DashboardPage({
	searchParams,
}: {
	searchParams: Promise<{ from?: string; to?: string }>;
}) {
	const params = await searchParams;
	const filters = {
		startDate: params.from ?? undefined,
		endDate: params.to ?? undefined,
	};
	const stats = await getReportStats(filters);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Dashboard"
				subtitle="Revenue, projects, advisors, commissions & financial analytics"
			/>

			<Suspense fallback={<div className="h-9 w-64 bg-zinc-100 rounded animate-pulse" />}>
				<ReportsFilters basePath="/dashboard" />
			</Suspense>

			{/* 1. Summary Row - 4 key metrics */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card className="bg-zinc-900 text-white border-zinc-800">
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
							<IndianRupee className="h-3 w-3" /> Total Sales Value
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{formatCurrency(stats.summary.totalSalesValue)}</p>
						<p className="text-[11px] text-zinc-400 mt-0.5">{stats.summary.salesCount} sales</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
							<TrendingUp className="h-3 w-3 text-green-500" /> Revenue Collected
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-green-600">{formatCurrency(stats.summary.totalRevenueCollected)}</p>
						<p className="text-[11px] text-zinc-500 mt-0.5">{stats.summary.paymentsCount} payments</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
							<TrendingDown className="h-3 w-3 text-red-500" /> Total Expenses
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-red-600">{formatCurrency(stats.summary.totalExpenses)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
							<Wallet className="h-3 w-3 text-blue-500" /> Net Profit (Cash)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.summary.netProfit)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
							<IndianRupee className="h-3 w-3 text-amber-600" /> Extra Commission Paid
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-amber-700">
							{formatCurrency((stats.summary as any).totalExtraCommissionPaid ?? 0)}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* 1b. Enquiry conversions */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-bold flex items-center gap-2">
						<Users className="h-4 w-4" /> Enquiry Conversions
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="rounded-lg border border-zinc-200 p-4">
							<div className="text-[10px] font-semibold uppercase text-zinc-500">Converted enquiries</div>
							<div className="text-xl font-bold text-zinc-900">{stats.summary.enquiryConvertedCustomers}</div>
						</div>
						<div className="rounded-lg border border-zinc-200 p-4">
							<div className="text-[10px] font-semibold uppercase text-zinc-500">Converted customers who bought plots</div>
							<div className="text-xl font-bold text-green-700">{stats.summary.enquiryConvertedCustomersBoughtPlots}</div>
						</div>
						<div className="rounded-lg border border-zinc-200 p-4">
							<div className="text-[10px] font-semibold uppercase text-zinc-500">Revenue from converted customers</div>
							<div className="text-xl font-bold text-blue-700">{formatCurrency(stats.summary.enquiryConvertedRevenue)}</div>
						</div>
					</div>
					{stats.enquiryConversionTopCategories.length > 0 ? (
						<div className="mt-4">
							<div className="text-[10px] font-semibold uppercase text-zinc-500 mb-2">Top enquiry categories (upgrades)</div>
							<div className="space-y-2">
								{stats.enquiryConversionTopCategories.map((c) => (
									<div key={c.category} className="flex justify-between items-center">
										<span className="text-sm text-zinc-700 truncate pr-2">{c.category}</span>
										<span className="text-sm font-bold text-zinc-900">{c.count}</span>
									</div>
								))}
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			{/* 2. Collections vs Outstanding */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-bold flex items-center gap-2">
						<Target className="h-4 w-4" /> Collections vs Outstanding
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="rounded-lg border border-zinc-200 p-4">
							<div className="text-[10px] font-semibold uppercase text-zinc-500">Collected</div>
							<div className="text-xl font-bold text-green-600">{formatCurrency(stats.collectionsVsOutstanding.collected)}</div>
						</div>
						<div className="rounded-lg border border-zinc-200 p-4">
							<div className="text-[10px] font-semibold uppercase text-zinc-500">Outstanding</div>
							<div className="text-xl font-bold text-red-600">{formatCurrency(stats.collectionsVsOutstanding.outstanding)}</div>
						</div>
						<div className="rounded-lg border border-zinc-200 p-4">
							<div className="text-[10px] font-semibold uppercase text-zinc-500">Total Sales</div>
							<div className="text-xl font-bold">{formatCurrency(stats.collectionsVsOutstanding.total)}</div>
						</div>
					</div>
					{stats.collectionsVsOutstanding.total > 0 && (
						<div className="mt-4">
							<div className="flex justify-between text-xs mb-1">
								<span>Collection %</span>
								<span>{Math.round((stats.collectionsVsOutstanding.collected / stats.collectionsVsOutstanding.total) * 100)}%</span>
							</div>
							<Progress value={(stats.collectionsVsOutstanding.collected / stats.collectionsVsOutstanding.total) * 100} className="h-2" />
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Building2 className="h-4 w-4" /> Project Inventory Status
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{stats.projectStats.map((project) => {
							const percentage = project.total > 0 ? (project.sold / project.total) * 100 : 0;
							return (
								<div key={project.name} className="space-y-2">
									<div className="flex justify-between text-sm">
										<span className="font-semibold">{project.name}</span>
										<span className="text-zinc-500">{project.sold} / {project.total} Plots Sold</span>
									</div>
									<Progress value={percentage} className="h-2" />
									<div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase">
										<span>{Math.round(percentage)}% Completed</span>
										<span>{project.available} Available • {project.soldInPeriod} sold in period</span>
									</div>
								</div>
							);
						})}
						{stats.projectStats.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">No projects found</p>}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Users className="h-4 w-4" /> Advisor Commission Summary
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4 max-h-64 overflow-y-auto">
							{stats.advisorPerformance.map((advisor) => (
								<div key={advisor.name} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
									<div className="min-w-0">
										<p className="text-sm font-bold truncate">{advisor.name}</p>
										<p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Paid: {formatCurrency(advisor.paidCommission)}</p>
									</div>
									<div className="text-right">
										<p className="text-sm font-bold text-zinc-900">{formatCurrency(advisor.totalCommission)}</p>
										<p className="text-[10px] text-red-500 font-bold uppercase">Due: {formatCurrency(advisor.pending)}</p>
									</div>
								</div>
							))}
							{stats.advisorPerformance.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">No advisors found</p>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<BarChart3 className="h-4 w-4" /> Revenue by Project
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.revenueByProject.sort((a, b) => b.value - a.value).map((p) => (
								<div key={p.name} className="flex justify-between items-center">
									<span className="text-sm font-medium truncate pr-2">{p.name}</span>
									<span className="text-sm font-bold text-green-600 shrink-0">{formatCurrency(p.value)}</span>
								</div>
							))}
							{stats.revenueByProject.length === 0 && <p className="text-sm text-zinc-400">No data</p>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<PieChart className="h-4 w-4" /> Revenue by Sale Phase
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.revenueByPhase.map((p) => (
								<div key={p.phase} className="flex justify-between items-center">
									<span className="text-sm font-medium capitalize">{p.phase.replace("_", " ")}</span>
									<span className="text-sm font-bold">{formatCurrency(p.value)}</span>
								</div>
							))}
							{stats.revenueByPhase.length === 0 && <p className="text-sm text-zinc-400">No data</p>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Users className="h-4 w-4" /> Top Advisors by Sales Value
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.topAdvisors.map((a, i) => (
								<div key={a.name} className="flex items-center gap-3">
									<span className="text-xs font-bold text-zinc-400 w-5">#{i + 1}</span>
									<span className="text-sm font-medium truncate flex-1">{a.name}</span>
									<span className="text-sm font-bold">{formatCurrency(a.value)}</span>
								</div>
							))}
							{stats.topAdvisors.length === 0 && <p className="text-sm text-zinc-400">No data</p>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<FileText className="h-4 w-4" /> Expense by Category
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.expenseByCategory.map((e) => (
								<div key={e.category} className="flex justify-between items-center">
									<span className="text-sm font-medium capitalize">{e.category}</span>
									<span className="text-sm font-bold text-red-600">{formatCurrency(e.value)}</span>
								</div>
							))}
							{stats.expenseByCategory.length === 0 && <p className="text-sm text-zinc-400">No expenses</p>}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-bold flex items-center gap-2">
						<Users className="h-4 w-4" /> New Customers in Period
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.newCustomersInPeriod}</p>
				</CardContent>
			</Card>

			{stats.salesByMonth.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<BarChart3 className="h-4 w-4" /> Sales Trend by Month
						</CardTitle>
					</CardHeader>
					<CardContent>
						<SalesTrendLineChart data={stats.salesByMonth as any} />
						<div className="mt-3 text-xs text-zinc-500">Y-axis range adapts automatically to the selected date range.</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
