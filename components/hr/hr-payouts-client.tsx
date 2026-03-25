"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { WeekBucket } from "@/lib/hr/salary-engine";
import { computeRegularHourlyEquivalent } from "@/lib/hr/salary-engine";
import type { HrSalaryType } from "@/lib/hr/types";
import { describeRegularRateBasis, describeSalaryBasis } from "@/lib/hr/payout-display";

function fmtHours(n: number) {
	return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

type PayoutRow = {
	id: string;
	total_days: number;
	total_hours: number;
	overtime_hours: number;
	required_hours: number;
	short_hours: number;
	deduction_amount: number;
	base_salary: number;
	overtime_pay: number;
	final_salary: number;
	paid_amount: number;
	remaining_amount: number;
	payout_status: string;
	weekly_breakdown?: WeekBucket[] | null;
	hr_employees?: {
		name?: string;
		employee_code?: string;
		salary_type?: string;
		salary_rate?: number;
		overtime_rate?: number;
		required_hours_per_week?: number;
		grace_hours?: number;
		deduction_enabled?: boolean;
	} | null;
};

function WeeklyBreakdownTable({ weeks }: { weeks: WeekBucket[] }) {
	if (!weeks.length) {
		return <p className="text-xs text-muted-foreground py-2">No weekly breakdown stored.</p>;
	}
	return (
		<div className="overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40">
			<table className="w-full min-w-[640px] text-xs">
				<thead>
					<tr className="border-b border-zinc-200 text-left text-muted-foreground dark:border-zinc-700">
						<th className="px-2 py-1.5 font-medium">Week (Mon range)</th>
						<th className="px-2 py-1.5 text-right font-medium">Worked h</th>
						<th className="px-2 py-1.5 text-right font-medium">Required h</th>
						<th className="px-2 py-1.5 text-right font-medium">Short h</th>
						<th className="px-2 py-1.5 text-right font-medium">OT h</th>
						<th className="px-2 py-1.5 text-right font-medium">Shortfall deduction</th>
					</tr>
				</thead>
				<tbody>
					{weeks.map((w) => (
						<tr key={w.weekKey} className="border-b border-zinc-100 dark:border-zinc-800">
							<td className="px-2 py-1.5 font-mono tabular-nums">
								{w.start} → {w.end}
							</td>
							<td className="px-2 py-1.5 text-right tabular-nums">{fmtHours(w.workedHours)}</td>
							<td className="px-2 py-1.5 text-right tabular-nums">{fmtHours(w.requiredHours)}</td>
							<td className="px-2 py-1.5 text-right tabular-nums">{fmtHours(w.shortHours)}</td>
							<td className="px-2 py-1.5 text-right tabular-nums">{fmtHours(w.overtimeHours)}</td>
							<td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(Number(w.deduction))}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function HrPayoutsClient({ initialBatches }: { initialBatches: any[] }) {
	const router = useRouter();
	const [month, setMonth] = useState(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	});
	const [search, setSearch] = useState("");
	const [genLoading, setGenLoading] = useState(false);
	const [payLoading, setPayLoading] = useState<string | null>(null);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	const toggleExpand = (id: string) => {
		setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const filteredBatches = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return initialBatches ?? [];
		return (initialBatches ?? [])
			.map((batch: any) => ({
				...batch,
				hr_employee_payouts: (batch.hr_employee_payouts ?? []).filter((p: PayoutRow) => {
					const code = String(p.hr_employees?.employee_code ?? "").toLowerCase();
					const name = String(p.hr_employees?.name ?? "").toLowerCase();
					return code.includes(q) || name.includes(q);
				}),
			}))
			.filter((batch: any) => (batch.hr_employee_payouts ?? []).length > 0);
	}, [initialBatches, search]);

	const generate = async () => {
		setGenLoading(true);
		try {
			const res = await fetch("/api/hr/payouts/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ month }),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Failed");
				return;
			}
			toast.success(`Payout calculated: ${data.month_label ?? month}`, {
				description:
					typeof data.period_from === "string" && typeof data.period_to === "string"
						? `${data.employees_processed ?? "—"} employees · attendance ${data.period_from} → ${data.period_to} · shortfall uses weekly buckets (prorated at month edges).`
						: "Open the batch below for hours, rates, and weekly breakdown.",
				duration: 8000,
			});
			router.refresh();
		} finally {
			setGenLoading(false);
		}
	};

	const pay = async (rowId: string, amount: number) => {
		setPayLoading(rowId);
		try {
			const res = await fetch("/api/hr/payouts/pay", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: rowId, paid_amount: amount }),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Failed");
				return;
			}
			toast.success("Payment recorded");
			router.refresh();
		} finally {
			setPayLoading(null);
		}
	};

	const batches = filteredBatches;
	const searchActive = search.trim().length > 0;

	return (
		<div className="space-y-6">
			<Card>
				<CardContent className="space-y-4 p-4">
					<div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
						<div className="grid gap-1.5">
							<label htmlFor="payout-month" className="text-sm font-medium">
								Month
							</label>
							<Input
								id="payout-month"
								type="month"
								className="w-full min-w-[11rem] font-mono sm:w-44"
								value={month}
								onChange={(e) => setMonth(e.target.value)}
							/>
							<p className="text-[11px] text-muted-foreground max-w-sm">
								Uses calendar month boundaries. Attendance rows must fall in this range. Re-running replaces lines in
								the same batch (same month label) only.
							</p>
						</div>
						<Button type="button" onClick={() => void generate()} disabled={genLoading} className="gap-2 shrink-0">
							{genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							Calculate payout for month
						</Button>
					</div>
					<div className="grid gap-1.5 max-w-md">
						<label htmlFor="payout-search" className="text-sm font-medium flex items-center gap-1.5">
							<Search className="h-3.5 w-3.5 opacity-70" />
							Search employee
						</label>
						<Input
							id="payout-search"
							placeholder="Code or name…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						{searchActive && batches.length === 0 ? (
							<p className="text-xs text-amber-700 dark:text-amber-300">No employees match this search in any batch.</p>
						) : null}
					</div>
				</CardContent>
			</Card>

			{!(initialBatches ?? []).length ? (
				<p className="text-sm text-muted-foreground">No batches yet. Pick a month and calculate.</p>
			) : (
				<div className="space-y-6">
					{batches.map((batch: any) => (
						<Card key={batch.id}>
							<CardContent className="space-y-3 p-4">
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<div className="font-semibold">
										{batch.month_label}{" "}
										<span className="text-xs font-normal text-muted-foreground">({batch.status})</span>
									</div>
									<span className="text-xs text-muted-foreground">
										{(batch.hr_employee_payouts ?? []).length} employee
										{(batch.hr_employee_payouts ?? []).length === 1 ? "" : "s"}
										{searchActive ? " (filtered)" : ""}
									</span>
								</div>
								<div className="overflow-x-auto -mx-1 px-1 [scrollbar-width:thin]">
									<table className="w-full min-w-[1100px] text-sm">
										<thead>
											<tr className="border-b text-left text-xs text-muted-foreground">
												<th className="w-8 py-2 pr-1" aria-hidden />
												<th className="py-2 pr-2 min-w-[9rem]">Employee</th>
												<th className="py-2 pr-2" title="Salary type from HR master">
													Type
												</th>
												<th className="py-2 pr-2 text-right" title="Days with worked hours &gt; 0">
													Days
												</th>
												<th className="py-2 pr-2 text-right" title="Sum of duration from attendance">
													Work h
												</th>
												<th className="py-2 pr-2 text-right" title="Prorated required hours for the month">
													Req h
												</th>
												<th className="py-2 pr-2 text-right" title="After grace hours per week">
													Short h
												</th>
												<th className="py-2 pr-2 text-right" title="Overtime hours from attendance">
													OT h
												</th>
												<th className="py-2 pr-2 text-right" title="Rate used for shortfall deduction">
													Reg ₹/h
												</th>
												<th className="py-2 pr-2 text-right" title="Overtime pay rate">
													OT ₹/h
												</th>
												<th className="py-2 pr-2 text-right">Base</th>
												<th className="py-2 pr-2 text-right">Deduct</th>
												<th className="py-2 pr-2 text-right">OT pay</th>
												<th className="py-2 pr-2 text-right font-medium">Net</th>
												<th className="py-2 pr-2 text-right">Paid</th>
												<th className="py-2 pr-2 text-right">Due</th>
												<th className="py-2 pr-2">Status</th>
												<th className="py-2 min-w-[7rem]">Pay</th>
											</tr>
										</thead>
										<tbody>
											{(batch.hr_employee_payouts ?? []).map((p: PayoutRow) => {
												const emp = p.hr_employees ?? {};
												const st = (emp.salary_type ?? "monthly") as HrSalaryType;
												const sr = Number(emp.salary_rate ?? 0);
												const rh = Number(emp.required_hours_per_week ?? 48);
												const otRate = Number(emp.overtime_rate ?? 0);
												const dedOn = emp.deduction_enabled !== false;
												const regHr = computeRegularHourlyEquivalent(st, sr, rh);
												const isOpen = Boolean(expanded[p.id]);
												const weeks = Array.isArray(p.weekly_breakdown) ? p.weekly_breakdown : [];
												return (
													<Fragment key={p.id}>
														<tr className="border-b border-zinc-100 dark:border-zinc-800 align-top">
															<td className="py-2 pr-1">
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8 p-0"
																	onClick={() => toggleExpand(p.id)}
																	aria-expanded={isOpen}
																	aria-label={isOpen ? "Hide weekly breakdown" : "Show weekly breakdown"}
																>
																	{isOpen ? (
																		<ChevronDown className="h-4 w-4" />
																	) : (
																		<ChevronRight className="h-4 w-4" />
																	)}
																</Button>
															</td>
															<td className="py-2 pr-2">
																<div className="font-mono text-xs text-muted-foreground">
																	#{emp.employee_code ?? "—"}
																</div>
																<div className="font-medium leading-tight">{emp.name ?? "—"}</div>
																<div className="mt-1 text-[10px] leading-snug text-muted-foreground max-w-[14rem]">
																	{describeSalaryBasis({
																		salary_type: String(emp.salary_type ?? "monthly"),
																		salary_rate: sr,
																		presentDays: Number(p.total_days ?? 0),
																		totalWorkedHours: Number(p.total_hours ?? 0),
																		requiredHoursMonth: Number(p.required_hours ?? 0),
																	})}
																	{!dedOn ? " · Shortfall deduction off" : ""}
																</div>
															</td>
															<td className="py-2 pr-2 capitalize text-xs">{emp.salary_type ?? "—"}</td>
															<td className="py-2 pr-2 text-right tabular-nums">{p.total_days ?? 0}</td>
															<td className="py-2 pr-2 text-right tabular-nums">{fmtHours(Number(p.total_hours ?? 0))}</td>
															<td className="py-2 pr-2 text-right tabular-nums">{fmtHours(Number(p.required_hours ?? 0))}</td>
															<td className="py-2 pr-2 text-right tabular-nums">{fmtHours(Number(p.short_hours ?? 0))}</td>
															<td className="py-2 pr-2 text-right tabular-nums">{fmtHours(Number(p.overtime_hours ?? 0))}</td>
															<td
																className="py-2 pr-2 text-right tabular-nums text-xs"
																title={describeRegularRateBasis(String(emp.salary_type ?? "monthly"), rh)}
															>
																{formatCurrency(regHr)}
															</td>
															<td className="py-2 pr-2 text-right tabular-nums text-xs">{formatCurrency(otRate)}</td>
															<td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(Number(p.base_salary))}</td>
															<td className="py-2 pr-2 text-right tabular-nums text-amber-800 dark:text-amber-200">
																{formatCurrency(Number(p.deduction_amount))}
															</td>
															<td className="py-2 pr-2 text-right tabular-nums text-emerald-800 dark:text-emerald-200">
																{formatCurrency(Number(p.overtime_pay))}
															</td>
															<td className="py-2 pr-2 text-right font-semibold tabular-nums">
																{formatCurrency(Number(p.final_salary))}
															</td>
															<td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(Number(p.paid_amount))}</td>
															<td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(Number(p.remaining_amount))}</td>
															<td className="py-2 pr-2 capitalize text-xs">{p.payout_status}</td>
															<td className="py-2">
																<div className="flex items-center gap-1">
																	<Input
																		className="h-8 w-20 text-xs"
																		type="number"
																		id={`pay-${p.id}`}
																		placeholder="Amt"
																	/>
																	<Button
																		type="button"
																		size="sm"
																		variant="outline"
																		disabled={payLoading === p.id}
																		onClick={() => {
																			const el = document.getElementById(`pay-${p.id}`) as HTMLInputElement | null;
																			const v = Number(el?.value ?? 0);
																			if (!v) return;
																			pay(p.id, v);
																		}}
																	>
																		{payLoading === p.id ? (
																			<Loader2 className="h-3 w-3 animate-spin" />
																		) : (
																			"Pay"
																		)}
																	</Button>
																</div>
															</td>
														</tr>
														{isOpen ? (
															<tr className="border-b border-zinc-100 dark:border-zinc-800 bg-muted/30">
																<td colSpan={18} className="px-2 py-3">
																	<p className="text-xs font-semibold text-muted-foreground mb-2">
																		Weekly breakdown (shortfall &amp; deduction per ISO week; month edges prorated)
																	</p>
																	<WeeklyBreakdownTable weeks={weeks} />
																	<p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
																		<strong>Monthly:</strong> base is pro-rata of the monthly salary vs required hours in this month (no
																		separate shortfall deduction that can exceed pay). <strong>Daily:</strong> base = days × day rate;
																		shortfall deductions are capped so net cannot fall below the value of hours worked.{" "}
																		<strong>Hourly:</strong> base = worked × rate; no norm shortfall deduction. OT pay = OT hours × OT ₹/h.
																		Reg ₹/h = package implied rate for reference (weekly table still shows theoretical shortfall per week).
																	</p>
																</td>
															</tr>
														) : null}
													</Fragment>
												);
											})}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
