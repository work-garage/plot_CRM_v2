"use client";

import { useState } from "react";
import Link from "next/link";
import {
	Card,
	CardContent,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Button,
	Badge,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { PasswordResetButton } from "@/components/advisors/password-reset-button";
import {
	User,
	KeyRound,
	ExternalLink,
	IndianRupee,
	Home,
	FileText,
} from "lucide-react";
import { getAdvisorAnalytics } from "@/app/actions/advisors";
import { useModules } from "@/components/providers/module-context";

type AdvisorRow = {
	id: string;
	name: string;
	code: string;
	phone: string;
	is_active: boolean;
};

type SalesAgg = { salesCount: number; revenue: number; due: number };
type CommAgg = { pending: number; paid: number; total: number };

export function AdvisorAnalyticsTable({
	advisors,
	salesAgg,
	commAgg,
}: {
	advisors: AdvisorRow[];
	salesAgg: Record<string, SalesAgg>;
	commAgg: Record<string, CommAgg>;
}) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getAdvisorAnalytics>> | null>(null);
	const [loading, setLoading] = useState(false);
	const { modules } = useModules();
	const visibleColumnCount =
		5 + (modules.sales ? 2 : 0) + (modules.payments ? 1 : 0) + (modules.commissions ? 1 : 0);

	async function openAdvisor(id: string) {
		setSelectedId(id);
		setLoading(true);
		setAnalytics(null);
		try {
			const data = await getAdvisorAnalytics(id);
			setAnalytics(data);
		} finally {
			setLoading(false);
		}
	}

	const selected = advisors.find((a) => a.id === selectedId);

	return (
		<>
			<Card>
				<CardContent className="p-0 overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Advisor</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Status</TableHead>
								{modules.sales && <TableHead className="text-right">Sales</TableHead>}
								{modules.sales && <TableHead className="text-right">Revenue</TableHead>}
								{modules.payments && <TableHead className="text-right">Customer Due</TableHead>}
								{modules.commissions && <TableHead className="text-right">Commission Pending</TableHead>}
								<TableHead className="text-right">Password</TableHead>
								<TableHead className="text-right">Open</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{advisors.length === 0 ? (
								<TableRow>
									<TableCell colSpan={visibleColumnCount} className="py-10 text-center text-sm text-zinc-500">
										No advisors yet.
									</TableCell>
								</TableRow>
							) : (
								advisors.map((a) => {
									const s = salesAgg[a.id] ?? { salesCount: 0, revenue: 0, due: 0 };
									const c = commAgg[a.id] ?? { pending: 0, paid: 0, total: 0 };
									return (
										<TableRow
											key={a.id}
											className="hover:bg-zinc-50 cursor-pointer"
											onClick={() => openAdvisor(a.id)}
										>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-semibold">{a.name}</span>
													<span className="text-xs text-zinc-500 font-mono">{a.code}</span>
												</div>
											</TableCell>
											<TableCell>{a.phone}</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={
														a.is_active
															? "bg-green-50 text-green-700 border-green-200"
															: "bg-zinc-50 text-zinc-500 border-zinc-200"
													}
												>
													{a.is_active ? "Active" : "Inactive"}
												</Badge>
											</TableCell>
											{modules.sales && <TableCell className="text-right font-semibold">{s.salesCount}</TableCell>}
											{modules.sales && (
											<TableCell className="text-right font-semibold">
												<div>
													<div>{formatCurrency(s.revenue - c.total)}</div>
												</div>
											</TableCell>
											)}
											{modules.payments && (
											<TableCell className={`text-right font-semibold ${s.due >= 0 ? "text-red-600" : "text-green-700"}`}>
												{formatCurrency(s.due)}
											</TableCell>
											)}
											{modules.commissions && (
											<TableCell className="text-right font-semibold text-amber-700">
												{formatCurrency(c.pending)}
											</TableCell>
											)}
											<TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
												<PasswordResetButton advisorId={a.id} advisorPhone={a.phone} />
											</TableCell>
											<TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
												<Link href={`/advisors/${a.id}`}>
													<Button size="sm" variant="outline" className="h-8">View</Button>
												</Link>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 min-w-0">
								<User className="h-5 w-5 shrink-0" />
								<span className="truncate">{selected?.name ?? "Advisor Details"}</span>
							</div>
							<Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(null)}>
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>

					{loading ? (
						<div className="space-y-4 py-6">
							<div className="h-6 w-48 bg-zinc-200 rounded animate-pulse" />
							<div className="h-32 bg-zinc-100 rounded animate-pulse" />
							<div className="h-32 bg-zinc-100 rounded animate-pulse" />
						</div>
					) : analytics && selected ? (
						<div className="space-y-6">
							{/* Profile & Login */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="rounded-lg border border-zinc-200 p-4 space-y-3">
									<h3 className="text-sm font-semibold flex items-center gap-2">
										<User className="h-4 w-4" /> Profile
									</h3>
									<div className="text-sm space-y-1">
										<p><span className="text-zinc-500">Code:</span> <span className="font-mono">{analytics.advisor.code}</span></p>
										<p><span className="text-zinc-500">Phone:</span> {analytics.advisor.phone}</p>
										<div className="flex items-center gap-2">
											<span className="text-zinc-500">Status:</span>
											<Badge variant={analytics.advisor.is_active ? "default" : "secondary"}>
												{analytics.advisor.is_active ? "Active" : "Inactive"}
											</Badge>
										</div>
									</div>
								</div>
								<div className="rounded-lg border border-zinc-200 p-4 space-y-3">
									<h3 className="text-sm font-semibold flex items-center gap-2">
										<KeyRound className="h-4 w-4" /> Login
									</h3>
									<div className="text-sm space-y-1">
										<p><span className="text-zinc-500">Email (login):</span>{" "}
											<span className="font-mono text-xs break-all">{analytics.advisor.email ?? "—"}</span>
										</p>
										<p className="text-[11px] text-zinc-500">
											Default password: last 10 digits of phone
										</p>
										<PasswordResetButton advisorId={selected.id} advisorPhone={selected.phone} />
									</div>
								</div>
							</div>

							{/* Summary stats - only shown if modules enabled */}
							{(modules.sales || modules.commissions) && (
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								{modules.sales && (
								<div className="rounded-lg border border-zinc-200 p-3">
									<div className="text-[10px] font-semibold uppercase text-zinc-500">Sales</div>
									<div className="text-lg font-bold">{analytics.salesCount}</div>
								</div>
								)}
								{modules.sales && (
								<div className="rounded-lg border border-zinc-200 p-3">
									<div className="text-[10px] font-semibold uppercase text-zinc-500">Revenue</div>
									<div className="text-lg font-bold text-green-600">{formatCurrency(analytics.totalRevenue)}</div>
								</div>
								)}
								{modules.commissions && (
								<div className="rounded-lg border border-zinc-200 p-3">
									<div className="text-[10px] font-semibold uppercase text-zinc-500">Commission Paid</div>
									<div className="text-lg font-bold">{formatCurrency(analytics.commissionPaid)}</div>
								</div>
								)}
								{modules.commissions && (
								<div className="rounded-lg border border-zinc-200 p-3">
									<div className="text-[10px] font-semibold uppercase text-amber-600">Commission Pending</div>
									<div className="text-lg font-bold text-amber-600">{formatCurrency(analytics.commissionPending)}</div>
								</div>
								)}
							</div>
							)}

							{/* Sales history - only if sales module enabled */}
							{modules.sales && (
							<div className="rounded-lg border border-zinc-200 overflow-hidden">
								<h3 className="text-sm font-semibold p-3 border-b flex items-center gap-2">
									<Home className="h-4 w-4" /> Sales History ({analytics.sales.length})
								</h3>
								<div className="max-h-48 overflow-y-auto">
									{analytics.sales.length === 0 ? (
										<p className="p-4 text-sm text-zinc-500 text-center">No sales</p>
									) : (
										<table className="w-full text-sm">
											<thead>
												<tr className="bg-zinc-50 border-b">
													<th className="text-left p-2">Plot / Project</th>
													<th className="text-left p-2">Customer</th>
													<th className="text-right p-2">Total</th>
													<th className="text-right p-2">Paid</th>
													<th className="text-right p-2">Due</th>
													<th className="text-left p-2">Phase</th>
												</tr>
											</thead>
											<tbody>
												{analytics.sales.map((s) => (
													<tr key={s.id} className="border-b last:border-0">
														<td className="p-2">{s.plot_number} • {s.project_name}</td>
														<td className="p-2">{s.customer_name}</td>
														<td className="p-2 text-right font-medium">{formatCurrency(s.total_sale_amount)}</td>
														<td className="p-2 text-right text-green-600">{formatCurrency(s.amount_paid)}</td>
														<td className="p-2 text-right text-red-600">{formatCurrency(s.remaining_amount)}</td>
														<td className="p-2">{s.sale_phase}</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>
							)}

							{/* Commission history - only if commissions module enabled */}
							{modules.commissions && (
							<div className="rounded-lg border border-zinc-200 overflow-hidden">
								<h3 className="text-sm font-semibold p-3 border-b flex items-center gap-2">
									<IndianRupee className="h-4 w-4" /> Commission History ({analytics.commissions.length})
								</h3>
								<div className="max-h-40 overflow-y-auto">
									{analytics.commissions.length === 0 ? (
										<p className="p-4 text-sm text-zinc-500 text-center">No commissions</p>
									) : (
										<table className="w-full text-sm">
											<thead>
												<tr className="bg-zinc-50 border-b">
													<th className="text-left p-2">Plot</th>
													<th className="text-right p-2">Total</th>
													<th className="text-right p-2">Paid</th>
													<th className="text-right p-2">Pending</th>
												</tr>
											</thead>
											<tbody>
												{analytics.commissions.map((c) => (
													<tr key={c.id} className="border-b last:border-0">
														<td className="p-2">{c.plot_number}</td>
														<td className="p-2 text-right">{formatCurrency(c.total_commission_amount)}</td>
														<td className="p-2 text-right text-green-600">{formatCurrency(c.amount_paid)}</td>
														<td className="p-2 text-right text-amber-600">{formatCurrency(c.remaining_commission)}</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>
							)}

							<div className="flex gap-2 pt-2">
								<Link href={`/advisors/${selected.id}`}>
									<Button variant="default" className="gap-2">
										<ExternalLink className="h-4 w-4" /> Full Advisor Page
									</Button>
								</Link>
								{modules.commissions && (
									<Link href="/commissions">
										<Button variant="outline" className="gap-2">
											<FileText className="h-4 w-4" /> Manage Commissions
										</Button>
									</Link>
								)}
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
