"use client";

import { eachDayOfInterval, format } from "date-fns";
import { Card, CardContent } from "@/components/ui";
import { formatMinutesAsClock } from "@/lib/utils/formatters";
/** Same shape as AttendanceRecordVM (avoid circular imports). */
export type AttendanceReportRow = {
	id: string;
	employeeName: string;
	employeeCode: string;
	work_date: string;
	in_time: string | null;
	out_time: string | null;
	duration_minutes: number | null;
	overtime_minutes: number;
	is_valid: boolean;
	error?: string;
};

export type EmployeeBlockSort = "id" | "name" | "duration";

/** Numeric-aware sort for employee codes (shared with list view). */
export function compareEmployeeCode(a: string, b: string): number {
	const na = parseInt(String(a).replace(/\D/g, ""), 10);
	const nb = parseInt(String(b).replace(/\D/g, ""), 10);
	if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).replace(/\D/g, "") && String(b).replace(/\D/g, "")) {
		return na - nb;
	}
	return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Calendar YYYY-MM-DD from DB/API — avoids UTC drift from ISO strings. */
export function normalizeDateKey(s: string): string {
	const t = String(s ?? "")
		.trim()
		.slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
	return t;
}

function timeCellExcel(v: string | null | undefined): string {
	if (v == null || v === "") return "00:00";
	const s = String(v).trim();
	const m = /^(\d{1,2}):(\d{2})/.exec(s);
	if (!m) return "00:00";
	const hh = String(Math.min(23, parseInt(m[1]!, 10))).padStart(2, "0");
	const mm = m[2]!;
	return `${hh}:${mm}`;
}

/** Format headers using local calendar date (not parseISO UTC midnight). */
function dateHeadersLocal(d: string): { day: string; dow: string; dayOfMonth: number } {
	const t = normalizeDateKey(d);
	const y = parseInt(t.slice(0, 4), 10);
	const m = parseInt(t.slice(5, 7), 10);
	const day = parseInt(t.slice(8, 10), 10);
	if (!y || !m || !day) return { day: t, dow: "", dayOfMonth: 0 };
	const x = new Date(y, m - 1, day);
	if (Number.isNaN(x.getTime())) return { day: t, dow: "", dayOfMonth: day };
	return { day: format(x, "dd-MMM"), dow: format(x, "EEE"), dayOfMonth: day };
}

/** Every calendar day from min(work_date) through max(work_date) inclusive (no full-month padding). */
export function fullCalendarDatesFromRows(rows: AttendanceReportRow[]): string[] {
	const keys = rows.map((r) => normalizeDateKey(r.work_date)).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
	if (!keys.length) return [];
	const toLocal = (iso: string) => {
		const y = parseInt(iso.slice(0, 4), 10);
		const m = parseInt(iso.slice(5, 7), 10);
		const d = parseInt(iso.slice(8, 10), 10);
		return new Date(y, m - 1, d);
	};
	let min = toLocal(keys[0]!);
	let max = toLocal(keys[0]!);
	for (const k of keys) {
		const t = toLocal(k);
		if (t < min) min = t;
		if (t > max) max = t;
	}
	return eachDayOfInterval({ start: min, end: max }).map((d) => format(d, "yyyy-MM-dd"));
}

type EmpBlock = {
	code: string;
	name: string;
	byDate: Map<string, AttendanceReportRow>;
};

function buildEmployeeBlocks(rows: AttendanceReportRow[]): EmpBlock[] {
	const map = new Map<string, EmpBlock>();
	for (const r of rows) {
		const code = String(r.employeeCode || "").trim() || "?";
		if (!map.has(code)) {
			map.set(code, { code, name: r.employeeName || "—", byDate: new Map() });
		}
		const b = map.get(code)!;
		b.byDate.set(normalizeDateKey(r.work_date), r);
		if (r.employeeName && r.employeeName !== "—") b.name = r.employeeName;
	}
	return [...map.values()];
}

function sortEmployeeBlocks(blocks: EmpBlock[], order: EmployeeBlockSort): EmpBlock[] {
	const copy = [...blocks];
	if (order === "name") {
		return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
	}
	if (order === "duration") {
		const sumDur = (blk: EmpBlock) => {
			let d = 0;
			for (const r of blk.byDate.values()) d += r.duration_minutes ?? 0;
			return d;
		};
		return copy.sort((a, b) => sumDur(b) - sumDur(a));
	}
	return copy.sort((a, b) => compareEmployeeCode(a.code, b.code));
}

function hoursLabel(minutes: number): string {
	if (!minutes) return "0h";
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

/** One card per employee: total duration & OT */
export function EmployeeTotalsStrip({
	rows,
	sortOrder = "id",
}: {
	rows: AttendanceReportRow[];
	sortOrder?: EmployeeBlockSort;
}) {
	const blocks = sortEmployeeBlocks(buildEmployeeBlocks(rows), sortOrder);
	if (!blocks.length) return null;

	return (
		<div className="space-y-2">
			<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
				Totals by employee
			</p>
			<div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 [scrollbar-width:thin]">
				{blocks.map((b) => {
					let dur = 0;
					let ot = 0;
					let inv = 0;
					for (const r of b.byDate.values()) {
						dur += r.duration_minutes ?? 0;
						ot += r.overtime_minutes ?? 0;
						if (!r.is_valid) inv++;
					}
					return (
						<Card
							key={b.code}
							className="min-w-[104px] max-w-[140px] shrink-0 border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white shadow-sm dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950"
						>
							<CardContent className="space-y-1 p-2">
								<div className="flex items-start justify-between gap-1">
									<span className="min-w-0 truncate font-mono text-[11px] font-bold tabular-nums text-primary">
										#{b.code}
									</span>
									{inv > 0 ? (
										<span
											title={`${inv} invalid row(s)`}
											className="shrink-0 rounded bg-red-100 px-1 py-px text-[8px] font-medium leading-none text-red-800 dark:bg-red-950 dark:text-red-200"
										>
											{inv}!
										</span>
									) : null}
								</div>
								<p className="line-clamp-2 text-[10px] font-medium leading-snug text-foreground">{b.name}</p>
								<div className="grid grid-cols-2 gap-1 border-t border-zinc-200 pt-1.5 text-[9px] dark:border-zinc-800">
									<div className="min-w-0">
										<p className="truncate text-muted-foreground">Dur</p>
										<p className="truncate font-semibold tabular-nums text-[10px]">{hoursLabel(dur)}</p>
									</div>
									<div className="min-w-0">
										<p className="truncate text-muted-foreground">OT</p>
										<p
											className={`truncate font-semibold tabular-nums text-[10px] ${ot > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}
										>
											{hoursLabel(ot)}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

/** Narrow sticky column — metric labels only (no extra Day/Date/Weekday rows). */
const thCorner =
	"sticky left-0 z-30 w-14 min-w-[3.5rem] max-w-[4rem] shrink-0 border border-zinc-300 bg-slate-200 px-1 py-1.5 text-center text-[9px] font-semibold uppercase leading-tight text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
const tdSticky =
	"sticky left-0 z-20 w-14 min-w-[3.5rem] max-w-[4rem] shrink-0 border border-zinc-300 bg-zinc-50 px-1 py-0.5 text-left text-[10px] font-medium leading-tight text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100";
const cell =
	"border border-zinc-300 px-0.5 py-0.5 text-center font-mono tabular-nums text-[10px] sm:text-[11px] dark:border-zinc-600";
const thDate =
	"min-w-[2.65rem] sm:min-w-[3rem] border border-zinc-300 bg-slate-100 px-0.5 py-1 align-bottom dark:border-zinc-600 dark:bg-zinc-900";

/** Excel-style blocks: dates as columns (min…max in data), metrics as rows */
export function WorkDurationPivotGrids({
	rows,
	sortOrder = "id",
}: {
	rows: AttendanceReportRow[];
	sortOrder?: EmployeeBlockSort;
}) {
	const dates = fullCalendarDatesFromRows(rows);
	const blocks = sortEmployeeBlocks(buildEmployeeBlocks(rows), sortOrder);

	if (!rows.length) {
		return (
			<p className="text-sm text-muted-foreground border border-dashed border-zinc-300 rounded-lg p-8 text-center dark:border-zinc-600">
				No attendance rows in this view.
			</p>
		);
	}

	const rangeLabel =
		dates.length > 0
			? (() => {
					const a = dates[0]!;
					const b = dates[dates.length - 1]!;
					const p = (iso: string) => {
						const y = parseInt(iso.slice(0, 4), 10);
						const m = parseInt(iso.slice(5, 7), 10);
						const d = parseInt(iso.slice(8, 10), 10);
						return new Date(y, m - 1, d);
					};
					return `${format(p(a), "dd-MMM-yyyy")} → ${format(p(b), "dd-MMM-yyyy")}`;
				})()
			: "";

	return (
		<div className="max-w-full min-w-0 space-y-6 overflow-x-hidden">
			{rangeLabel ? (
				<p className="text-xs font-medium text-muted-foreground">
					Period: <span className="text-foreground">{rangeLabel}</span> · empty days show 00:00
				</p>
			) : null}
			<div className="space-y-8">
				{blocks.map((block) => (
					<Card
						key={block.code}
						className="overflow-hidden border border-zinc-300 shadow-md dark:border-zinc-600"
					>
						<div className="border-b border-zinc-300 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 dark:border-zinc-600">
							<div className="flex flex-wrap items-center gap-x-8 gap-y-1 text-sm">
								<span>
									<span className="text-muted-foreground">Employee Code:-</span>{" "}
									<span className="font-mono font-semibold tabular-nums">{block.code}</span>
								</span>
								<span>
									<span className="text-muted-foreground">Employee Name:-</span>{" "}
									<span className="font-medium">{block.name}</span>
								</span>
							</div>
						</div>
						{/* Horizontal scroll: parent must not use overflow-x-hidden */}
						<div className="w-full min-w-0 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-pt-0 bg-white pb-1 dark:bg-zinc-950 [scrollbar-width:thin]">
							<table className="w-max min-w-full border-collapse border border-zinc-300 text-[11px] sm:text-xs dark:border-zinc-600">
								<thead>
									<tr className="bg-slate-100 dark:bg-zinc-900">
										<th className={thCorner} scope="col">
											<span className="sr-only">Metric</span>
										</th>
										{dates.map((d) => {
											const { day, dow } = dateHeadersLocal(d);
											return (
												<th key={`hdr-${d}`} className={thDate} scope="col">
													<div className="flex flex-col items-center justify-end gap-0.5 leading-none">
														<span className="text-[11px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
															{day}
														</span>
														<span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">{dow}</span>
													</div>
												</th>
											);
										})}
									</tr>
								</thead>
								<tbody>
									{(
										[
											["In", "in"] as const,
											["Out", "out"] as const,
											["Dur", "dur"] as const,
											["OT", "ot"] as const,
											["T·Dur", "tdur"] as const,
										] as const
									).map(([label, kind]) => (
										<tr
											key={`${block.code}-${label}`}
											className="odd:bg-white even:bg-slate-50/80 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/40"
										>
											<td className={tdSticky}>{label}</td>
											{dates.map((d) => {
												const rec = block.byDate.get(d);
												let display = "00:00";
												if (rec) {
													if (kind === "in") display = timeCellExcel(rec.in_time);
													else if (kind === "out") display = timeCellExcel(rec.out_time);
													else if (kind === "dur")
														display =
															rec.duration_minutes != null && rec.duration_minutes > 0
																? formatMinutesAsClock(rec.duration_minutes)
																: "00:00";
													else if (kind === "ot")
														display =
															rec.overtime_minutes > 0
																? formatMinutesAsClock(rec.overtime_minutes)
																: "00:00";
													else if (kind === "tdur")
														display =
															rec.duration_minutes != null && rec.duration_minutes > 0
																? formatMinutesAsClock(rec.duration_minutes)
																: "00:00";
												}
												const inv = rec && !rec.is_valid;
												return (
													<td
														key={d}
														className={`${cell} ${
															inv ? "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100" : ""
														} ${
															kind === "ot" && rec && rec.overtime_minutes > 0
																? "font-semibold text-emerald-800 dark:text-emerald-300"
																: ""
														}`}
													>
														{display}
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}
