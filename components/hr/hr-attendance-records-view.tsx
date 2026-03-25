"use client";

import { useEffect, useMemo, useState } from "react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, Calendar, LayoutGrid, List } from "lucide-react";
import {
	Button,
	Card,
	CardContent,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import { formatMinutesAsClock } from "@/lib/utils/formatters";
import {
	type EmployeeBlockSort,
	compareEmployeeCode,
	EmployeeTotalsStrip,
	normalizeDateKey,
	WorkDurationPivotGrids,
} from "@/components/hr/hr-attendance-work-duration-report";

export type AttendanceRecordVM = {
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

function formatLocalYmd(iso: string): string {
	const t = normalizeDateKey(iso);
	const y = parseInt(t.slice(0, 4), 10);
	const m = parseInt(t.slice(5, 7), 10);
	const d = parseInt(t.slice(8, 10), 10);
	if (!y || !m || !d) return iso;
	return format(new Date(y, m - 1, d), "dd MMM yyyy");
}

function displayTime(v: string | null | undefined): string {
	if (v == null || v === "") return "—";
	const s = String(v).trim();
	const m = /^(\d{1,2}:\d{2})/.exec(s);
	return m ? m[1]! : s.slice(0, 8);
}

export function mapDbRowsToAttendanceVM(rows: any[]): AttendanceRecordVM[] {
	return rows.map((r) => ({
		id: String(r.id),
		employeeName: r.hr_employees?.name ?? "—",
		employeeCode: String(r.hr_employees?.employee_code ?? "—"),
		work_date: r.work_date,
		in_time: r.in_time,
		out_time: r.out_time,
		duration_minutes: r.duration_minutes,
		overtime_minutes: r.overtime_minutes ?? 0,
		is_valid: Boolean(r.is_valid),
	}));
}

export function mapPreviewToAttendanceVM(
	rows: Array<{
		employee_code: string;
		employee_name?: string;
		work_date: string;
		in_time: string | null;
		out_time: string | null;
		duration_minutes: number | null;
		overtime_minutes: number;
		is_valid: boolean;
		error?: string;
	}>
): AttendanceRecordVM[] {
	return rows.map((r, i) => ({
		id: `preview-${i}`,
		employeeName: r.employee_name ?? "—",
		employeeCode: r.employee_code,
		work_date: r.work_date,
		in_time: r.in_time,
		out_time: r.out_time,
		duration_minutes: r.duration_minutes,
		overtime_minutes: r.overtime_minutes ?? 0,
		is_valid: r.is_valid,
		error: r.error,
	}));
}

function AttendanceRowListTable({ records }: { records: AttendanceRecordVM[] }) {
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "employeeCode", desc: false },
		{ id: "work_date", desc: true },
	]);

	const columns = useMemo<ColumnDef<AttendanceRecordVM>[]>(
		() => [
			{
				accessorKey: "employeeCode",
				header: ({ column }) => (
					<Button variant="ghost" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
						Employee ID
						<ArrowUpDown className="ml-1 h-3 w-3" />
					</Button>
				),
				cell: ({ row }) => (
					<div>
						<div className="font-medium">{row.original.employeeName}</div>
						<div className="font-mono text-xs text-muted-foreground">{row.original.employeeCode}</div>
					</div>
				),
			},
			{
				accessorKey: "work_date",
				header: ({ column }) => (
					<Button variant="ghost" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
						Date
						<ArrowUpDown className="ml-1 h-3 w-3" />
					</Button>
				),
				cell: ({ row }) => formatLocalYmd(row.original.work_date),
			},
			{
				accessorKey: "in_time",
				header: "In time",
				cell: ({ row }) => (
					<span className="font-mono text-xs tabular-nums">{displayTime(row.original.in_time)}</span>
				),
			},
			{
				accessorKey: "out_time",
				header: "Out time",
				cell: ({ row }) => (
					<span className="font-mono text-xs tabular-nums">{displayTime(row.original.out_time)}</span>
				),
			},
			{
				accessorKey: "duration_minutes",
				header: "Duration",
				cell: ({ row }) => (
					<span className="font-mono text-xs">{formatMinutesAsClock(row.original.duration_minutes)}</span>
				),
			},
			{
				accessorKey: "overtime_minutes",
				header: "Overtime",
				cell: ({ row }) => (
					<span
						className={`font-mono text-xs ${row.original.overtime_minutes > 0 ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""}`}
					>
						{formatMinutesAsClock(row.original.overtime_minutes)}
					</span>
				),
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => (
					<span
						className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
							row.original.is_valid
								? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
								: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
						}`}
					>
						{row.original.is_valid ? "Valid" : "Invalid"}
					</span>
				),
			},
		],
		[]
	);

	const table = useReactTable({
		data: records,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="rounded-md border">
			<div className="max-h-[min(65vh,640px)] overflow-auto">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((hg) => (
							<TableRow key={hg.id} className="hover:bg-transparent">
								{hg.headers.map((h) => (
									<TableHead
										key={h.id}
										className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm"
									>
										{flexRender(h.column.columnDef.header, h.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => {
								const ot = row.original.overtime_minutes > 0;
								const inv = !row.original.is_valid;
								return (
									<TableRow
										key={row.id}
										className={
											inv
												? "bg-red-50/90 dark:bg-red-950/25"
												: ot
													? "border-l-4 border-l-emerald-500"
													: undefined
										}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
									No rows.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

export type HrFileReportMeta = {
	reportPeriodRaw?: string | null;
	reportPeriodStartIso?: string | null;
	reportPeriodEndIso?: string | null;
	generatedOnRaw?: string | null;
	generatedOnDateIso?: string | null;
};

export function HrAttendanceRecordsView({
	records,
	title,
	showFilters = true,
	parsedCalendarYear,
	fileReport,
}: {
	records: AttendanceRecordVM[];
	title?: string;
	showFilters?: boolean;
	/** Shown after import preview — year used when parsing DD-MMM cells */
	parsedCalendarYear?: number;
	/** Header lines read from the Work Duration file (CSV/Excel) */
	fileReport?: HrFileReportMeta | null;
}) {
	const [search, setSearch] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	/** When set (YYYY-MM-DD), only that day’s rows (still combined with From/To if set). */
	const [specificDay, setSpecificDay] = useState("");
	const [layout, setLayout] = useState<"report" | "list">("report");
	const [employeeOnly, setEmployeeOnly] = useState<string>("all");
	const [employeeSort, setEmployeeSort] = useState<EmployeeBlockSort>("id");

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		const dayKey =
			specificDay && /^\d{4}-\d{2}-\d{2}$/.test(specificDay) ? specificDay : "";
		return records.filter((r) => {
			if (q && !r.employeeName.toLowerCase().includes(q) && !r.employeeCode.toLowerCase().includes(q))
				return false;
			const wd = normalizeDateKey(r.work_date);
			if (from && wd < from) return false;
			if (to && wd > to) return false;
			if (dayKey && wd !== dayKey) return false;
			return true;
		});
	}, [records, search, from, to, specificDay]);

	const employeeOptions = useMemo(() => {
		const m = new Map<string, string>();
		for (const r of filtered) {
			if (!m.has(r.employeeCode)) m.set(r.employeeCode, r.employeeName);
		}
		return [...m.entries()].sort(([a], [b]) => compareEmployeeCode(a, b));
	}, [filtered]);

	useEffect(() => {
		if (employeeOnly !== "all" && !filtered.some((r) => r.employeeCode === employeeOnly)) {
			setEmployeeOnly("all");
		}
	}, [filtered, employeeOnly]);

	const viewRows = useMemo(() => {
		if (employeeOnly === "all") return filtered;
		return filtered.filter((r) => r.employeeCode === employeeOnly);
	}, [filtered, employeeOnly]);

	const meta = useMemo(() => {
		const emp = new Set(viewRows.map((r) => r.employeeCode));
		return { employees: emp.size, rows: viewRows.length };
	}, [viewRows]);

	/** Stable default for list + mobile: employee ID ↑, then date ↓ */
	const listRows = useMemo(() => {
		return [...viewRows].sort((a, b) => {
			const c = compareEmployeeCode(a.employeeCode, b.employeeCode);
			if (c !== 0) return c;
			return b.work_date.localeCompare(a.work_date);
		});
	}, [viewRows]);

	return (
		<div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
			<div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				{title ? (
					<h3 className="text-base font-semibold tracking-tight w-full min-w-0 sm:w-auto sm:max-w-[min(100%,28rem)]">
						{title}
					</h3>
				) : null}
				<div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/50 sm:w-auto">
					<Button
						type="button"
						size="sm"
						variant={layout === "report" ? "secondary" : "ghost"}
						className="h-8 gap-1.5 text-xs"
						onClick={() => setLayout("report")}
					>
						<LayoutGrid className="h-3.5 w-3.5" />
						Report (dates as columns)
					</Button>
					<Button
						type="button"
						size="sm"
						variant={layout === "list" ? "secondary" : "ghost"}
						className="h-8 gap-1.5 text-xs"
						onClick={() => setLayout("list")}
					>
						<List className="h-3.5 w-3.5" />
						All rows
					</Button>
				</div>
			</div>

			<p className="text-xs text-muted-foreground">
				<span className="font-medium text-foreground">{meta.employees}</span> employee
				{meta.employees === 1 ? "" : "s"} ·{" "}
				<span className="font-medium text-foreground">{meta.rows}</span> day record
				{meta.rows === 1 ? "" : "s"}
				{viewRows.length !== records.length ? ` (filtered from ${records.length})` : ""}
			</p>
			{parsedCalendarYear != null ? (
				<p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">
					Calendar year used for parsing:{" "}
					<span className="font-semibold text-foreground">{parsedCalendarYear}</span>
					<span className="opacity-80">
						{" "}
						(from the report date range / “Generated on” line in the file, or your device year if missing)
					</span>
				</p>
			) : null}
			{fileReport &&
			(fileReport.reportPeriodRaw ||
				fileReport.generatedOnRaw ||
				fileReport.reportPeriodStartIso ||
				fileReport.generatedOnDateIso) ? (
				<div className="rounded-md border border-sky-200/90 bg-sky-50/60 px-3 py-2 text-xs text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-100 space-y-1.5">
					<p className="font-semibold text-[11px] uppercase tracking-wide text-sky-900/90 dark:text-sky-200/90">
						From your uploaded file
					</p>
					{fileReport.reportPeriodRaw ? (
						<p className="leading-relaxed break-words">
							<span className="font-medium text-foreground">Attendance date range: </span>
							{fileReport.reportPeriodRaw}
						</p>
					) : fileReport.reportPeriodStartIso && fileReport.reportPeriodEndIso ? (
						<p className="leading-relaxed">
							<span className="font-medium text-foreground">Attendance date range: </span>
							{formatLocalYmd(fileReport.reportPeriodStartIso)} → {formatLocalYmd(fileReport.reportPeriodEndIso)}
						</p>
					) : null}
					{fileReport.generatedOnRaw ? (
						<p className="leading-relaxed break-words">
							<span className="font-medium text-foreground">Generated on: </span>
							{fileReport.generatedOnRaw.replace(/^Generated\s*On:\s*/i, "")}
						</p>
					) : fileReport.generatedOnDateIso ? (
						<p className="leading-relaxed">
							<span className="font-medium text-foreground">Generated on (date): </span>
							{formatLocalYmd(fileReport.generatedOnDateIso)}
						</p>
					) : null}
				</div>
			) : null}

			{showFilters && (
				<div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
					<div className="flex-1 min-w-[12rem]">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">Search employee</label>
						<Input
							placeholder="Name or code…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<div className="w-full min-w-[10rem] sm:w-48">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">Employee</label>
						<Select value={employeeOnly} onValueChange={setEmployeeOnly}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="All employees" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All employees</SelectItem>
								{employeeOptions.map(([code, name]) => (
									<SelectItem key={code} value={code}>
										<span className="font-mono">#{code}</span> {name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{layout === "report" && (
						<div className="w-full min-w-[10rem] sm:w-44">
							<label className="mb-1 block text-xs font-medium text-muted-foreground">Sort employees</label>
							<Select value={employeeSort} onValueChange={(v) => setEmployeeSort(v as EmployeeBlockSort)}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="id">By employee ID</SelectItem>
									<SelectItem value="name">By name (A–Z)</SelectItem>
									<SelectItem value="duration">By total duration (high → low)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
					<div className="w-full sm:w-40">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
						<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
					</div>
					<div className="w-full sm:w-40">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
						<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
					</div>
					<div className="w-full sm:w-40">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">Specific day</label>
						<div className="flex gap-1">
							<Input
								type="date"
								value={specificDay}
								onChange={(e) => setSpecificDay(e.target.value)}
								className="min-w-0 flex-1"
							/>
							{specificDay ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="shrink-0 px-2 text-xs"
									onClick={() => setSpecificDay("")}
								>
									Clear
								</Button>
							) : null}
						</div>
						<p className="mt-0.5 text-[10px] text-muted-foreground">
							Optional: show one day only (with From/To if set).
						</p>
					</div>
				</div>
			)}

			{layout === "report" ? (
				<div className="space-y-8">
					<EmployeeTotalsStrip rows={viewRows} sortOrder={employeeSort} />
					<div>
						<p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
							Date grid — one column per day in the current data range (00:00 when empty); scroll horizontally
						</p>
						<WorkDurationPivotGrids rows={viewRows} sortOrder={employeeSort} />
					</div>
				</div>
			) : (
				<div className="space-y-3">
					<p className="text-xs text-muted-foreground">Flat list — default sort: employee ID ↑, then date ↓</p>
					<div className="hidden md:block">
						<AttendanceRowListTable records={listRows} />
					</div>
					<div className="md:hidden space-y-3">
						{listRows.length === 0 ? (
							<p className="text-center text-sm text-muted-foreground py-8">No rows match filters.</p>
						) : (
							listRows.map((r) => {
								const inv = !r.is_valid;
								const ot = r.overtime_minutes > 0;
								return (
									<Card
										key={r.id}
										className={
											inv
												? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
												: ot
													? "border-l-4 border-l-emerald-500"
													: ""
										}
									>
										<CardContent className="p-4 space-y-2 text-sm">
											<div className="flex items-start justify-between gap-2">
												<div>
													<p className="font-semibold">{r.employeeName}</p>
													<p className="font-mono text-xs text-muted-foreground">ID {r.employeeCode}</p>
												</div>
												<span
													className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
														r.is_valid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
													}`}
												>
													{r.is_valid ? "Valid" : "Invalid"}
												</span>
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-xs">
												<Calendar className="h-3.5 w-3.5" />
												{formatLocalYmd(r.work_date)}
											</div>
											<div className="grid grid-cols-2 gap-2 text-xs">
												<div>
													<span className="text-muted-foreground">In</span>
													<p className="font-mono">{displayTime(r.in_time)}</p>
												</div>
												<div>
													<span className="text-muted-foreground">Out</span>
													<p className="font-mono">{displayTime(r.out_time)}</p>
												</div>
												<div>
													<span className="text-muted-foreground">Duration</span>
													<p className="font-mono">{formatMinutesAsClock(r.duration_minutes)}</p>
												</div>
												<div>
													<span className="text-muted-foreground">OT</span>
													<p className={`font-mono ${ot ? "font-semibold text-emerald-700" : ""}`}>
														{formatMinutesAsClock(r.overtime_minutes)}
													</p>
												</div>
											</div>
											{r.error ? <p className="text-xs text-amber-800 dark:text-amber-200">{r.error}</p> : null}
										</CardContent>
									</Card>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
}
