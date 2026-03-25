"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, FileWarning } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	HrAttendanceRecordsView,
	mapPreviewToAttendanceVM,
} from "@/components/hr/hr-attendance-records-view";
import { formatAttendanceSaveDescription } from "@/lib/hr/attendance-save-messages";

export type HrAttendanceUploadPreviewRow = {
	employee_code: string;
	employee_name?: string;
	work_date: string;
	in_time: string | null;
	out_time: string | null;
	duration_minutes: number | null;
	overtime_minutes: number;
	attendance_type: string;
	is_valid: boolean;
	error?: string;
};

export type HrAttendanceUploadResult = {
	inserted: number;
	/** New (employee, work_date) keys written */
	attendanceCreated?: number;
	/** Rows that replaced an existing day for that employee */
	attendanceUpdated?: number;
	parsed: number;
	format: string;
	errors: string[];
	previewRows: HrAttendanceUploadPreviewRow[];
	dryRun?: boolean;
	/** false when employee code/name don’t match HR — import blocked */
	hrValidationOk?: boolean;
	/** Rows that pass HR code + name match (can be saved). */
	hrAcceptedRows?: number;
	/** Rows skipped (unknown code / name mismatch / missing name). */
	hrSkippedRows?: number;
	/** Aggregated explanation (not one line per row). */
	hrSkippedSummary?: string;
	parseErrors?: string[];
	/** When false, Confirm is disabled (nothing to save). */
	canConfirmImport?: boolean;
	/** Calendar year used when parsing dates (from report title / browser year). */
	parsedCalendarYear?: number;
	/** From file header: "01-Mar-2026 To 21-Mar-2026" */
	reportPeriodRaw?: string | null;
	reportPeriodStartIso?: string | null;
	reportPeriodEndIso?: string | null;
	generatedOnRaw?: string | null;
	generatedOnDateIso?: string | null;
	/** From API: how re-imports merge with existing DB rows */
	attendanceMergePolicy?: string;
};

export function HrAttendanceUpload(props?: {
	onComplete?: (result: HrAttendanceUploadResult) => void;
}) {
	const { onComplete } = props ?? {};
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const pendingFileRef = useRef<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [preview, setPreview] = useState<HrAttendanceUploadResult | null>(null);

	const postFile = async (file: File, dryRun: boolean): Promise<HrAttendanceUploadResult | null> => {
		const fd = new FormData();
		fd.append("file", file);
		fd.append("defaultYear", String(new Date().getFullYear()));
		fd.append("dryRun", dryRun ? "1" : "0");
		const res = await fetch("/api/hr/attendance/upload", {
			method: "POST",
			body: fd,
			credentials: "same-origin",
		});
		const data = await res.json();
		if (!res.ok) {
			toast.error(data.error ?? "Upload failed");
			return null;
		}
		return {
			inserted: data.inserted ?? 0,
			attendanceCreated: typeof data.attendanceCreated === "number" ? data.attendanceCreated : undefined,
			attendanceUpdated: typeof data.attendanceUpdated === "number" ? data.attendanceUpdated : undefined,
			parsed: data.parsed ?? 0,
			format: data.format ?? "work-duration",
			errors: Array.isArray(data.errors) ? data.errors : [],
			previewRows: Array.isArray(data.previewRows) ? data.previewRows : [],
			dryRun: Boolean(data.dryRun),
			hrValidationOk: data.hrValidationOk !== false,
			hrAcceptedRows: typeof data.hrAcceptedRows === "number" ? data.hrAcceptedRows : undefined,
			hrSkippedRows: typeof data.hrSkippedRows === "number" ? data.hrSkippedRows : undefined,
			hrSkippedSummary: typeof data.hrSkippedSummary === "string" ? data.hrSkippedSummary : undefined,
			parseErrors: Array.isArray(data.parseErrors) ? data.parseErrors : [],
			canConfirmImport:
				typeof data.canConfirmImport === "boolean"
					? data.canConfirmImport
					: typeof data.hrAcceptedRows === "number"
						? data.hrAcceptedRows > 0
						: data.hrValidationOk !== false,
			parsedCalendarYear:
				typeof data.parsedCalendarYear === "number" ? data.parsedCalendarYear : undefined,
			reportPeriodRaw: typeof data.reportPeriodRaw === "string" ? data.reportPeriodRaw : undefined,
			reportPeriodStartIso:
				typeof data.reportPeriodStartIso === "string" ? data.reportPeriodStartIso : undefined,
			reportPeriodEndIso: typeof data.reportPeriodEndIso === "string" ? data.reportPeriodEndIso : undefined,
			generatedOnRaw: typeof data.generatedOnRaw === "string" ? data.generatedOnRaw : undefined,
			generatedOnDateIso: typeof data.generatedOnDateIso === "string" ? data.generatedOnDateIso : undefined,
			attendanceMergePolicy:
				typeof data.attendanceMergePolicy === "string" ? data.attendanceMergePolicy : undefined,
		};
	};

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const lower = file.name.toLowerCase();
		const ok =
			lower.endsWith(".csv") ||
			lower.endsWith(".xlsx") ||
			lower.endsWith(".xls") ||
			lower.endsWith(".xlsm");
		if (!ok) {
			toast.error("Use an Excel file (.xlsx / .xls) or a CSV export of the Work Duration report.");
			if (e.target) e.target.value = "";
			return;
		}
		setLoading(true);
		setPreview(null);
		try {
			pendingFileRef.current = file;
			const result = await postFile(file, true);
			if (!result) {
				pendingFileRef.current = null;
				return;
			}
			setPreview(result);
			toast("Preview ready", {
				description: `${result.parsed} rows parsed. Review and confirm import.`,
			});
		} finally {
			setLoading(false);
			if (e.target) e.target.value = "";
		}
	};

	const confirmImport = async () => {
		const file = pendingFileRef.current;
		if (!file) {
			toast.error("Choose the same file again to import.");
			return;
		}
		setLoading(true);
		try {
			const result = await postFile(file, false);
			if (!result) return;
			pendingFileRef.current = null;
			setPreview(null);
			onComplete?.(result);
			if (result.inserted > 0) {
				const desc = formatAttendanceSaveDescription(result);
				toast.success("Attendance saved", {
					description: desc,
					duration: 9000,
				});
				if ((result.hrSkippedRows ?? 0) > 0) {
					const msg =
						result.hrSkippedSummary?.slice(0, 320) ??
						`Skipped ${result.hrSkippedRows} row(s) — not found in HR or name did not match`;
					toast.message(msg, { duration: 9000 });
				}
			} else {
				const hint =
					result.errors?.find((e) => /row-level security|RLS/i.test(e)) ??
					result.errors?.[0] ??
					"Fix HR validation or database permissions (see messages below).";
				toast.error("Saved 0 rows", { description: String(hint).slice(0, 280) });
			}
			router.refresh();
		} finally {
			setLoading(false);
		}
	};

	const cancelPreview = () => {
		pendingFileRef.current = null;
		setPreview(null);
	};

	return (
		<div className="space-y-4">
			<input
				ref={inputRef}
				type="file"
				accept=".csv,.xlsx,.xls,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
				className="hidden"
				onChange={onFile}
			/>
			<Button
				size="sm"
				variant="default"
				className="gap-2"
				disabled={loading}
				onClick={() => inputRef.current?.click()}
			>
				{loading && !preview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
				Upload Excel / CSV
			</Button>

			{preview?.dryRun && (
				<div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<FileWarning className="h-4 w-4 text-amber-600" />
						<span className="font-medium">Import preview</span>
						<span className="text-muted-foreground">
							{preview.parsed} parsed row{preview.parsed === 1 ? "" : "s"} — not saved yet
						</span>
					</div>
					<div className="rounded-md border border-sky-200/90 bg-sky-50/70 px-3 py-2 text-[11px] leading-relaxed text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-100">
						<p className="font-semibold text-sky-900/95 dark:text-sky-200/95">How saving works</p>
						<p className="mt-1 opacity-95">
							{preview.attendanceMergePolicy ??
								"Each row is saved by employee + date. If that day already exists, it is replaced with this file’s values. New days are added. Re-uploading a shorter date range only changes those days — older saved dates stay in the database."}
						</p>
					</div>
					{(preview.hrAcceptedRows ?? 0) === 0 && preview.parsed > 0 && (
						<div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
							<p className="font-semibold mb-1">Cannot save — no rows match HR</p>
							<p className="mb-2 opacity-90 leading-relaxed">
								Each row needs a known employee code and a name that matches HR (case-insensitive). Fix the file or add
								employees in HR first.
							</p>
							{preview.hrSkippedSummary ? (
								<p className="text-[11px] sm:text-xs leading-relaxed border-t border-red-200/80 pt-2 dark:border-red-900/50">
									{preview.hrSkippedSummary}
								</p>
							) : null}
						</div>
					)}
					{(preview.hrAcceptedRows ?? 0) > 0 && (preview.hrSkippedRows ?? 0) > 0 && (
						<div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
							<p className="font-semibold mb-1">Partial import</p>
							<p className="opacity-90 leading-relaxed">
								{preview.hrAcceptedRows} row(s) will be saved. {preview.hrSkippedRows} row(s) will not be saved (employees
								missing from HR or name mismatch).
							</p>
							{preview.hrSkippedSummary ? (
								<p className="mt-2 text-[11px] sm:text-xs leading-relaxed border-t border-amber-200/80 pt-2 dark:border-amber-800/60">
									{preview.hrSkippedSummary}
								</p>
							) : null}
						</div>
					)}
					{(preview.parseErrors?.length ?? 0) > 0 && (
						<div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 max-h-40 overflow-y-auto">
							<p className="font-semibold mb-1">Parser messages</p>
							<ul className="list-disc pl-4 space-y-0.5">
								{(preview.parseErrors ?? []).slice(0, 40).map((err, i) => (
									<li key={i} className="break-words">
										{err}
									</li>
								))}
							</ul>
						</div>
					)}
					{(() => {
						const pe = new Set(preview.parseErrors ?? []);
						const other = preview.errors.filter((e) => !pe.has(e));
						return other.length > 0 ? (
							<div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100 max-h-32 overflow-y-auto">
								<p className="font-semibold mb-1">Other</p>
								<ul className="list-disc pl-4 space-y-0.5">
									{other.slice(0, 20).map((err, i) => (
										<li key={i} className="break-words">
											{err}
										</li>
									))}
								</ul>
							</div>
						) : null;
					})()}
					{preview.previewRows.length > 0 && (
						<div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-zinc-200/90 bg-zinc-50/40 p-2 sm:p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
							<HrAttendanceRecordsView
								records={mapPreviewToAttendanceVM(preview.previewRows)}
								title="Preview (first 500 rows)"
								showFilters
								parsedCalendarYear={preview.parsedCalendarYear}
								fileReport={{
									reportPeriodRaw: preview.reportPeriodRaw,
									reportPeriodStartIso: preview.reportPeriodStartIso,
									reportPeriodEndIso: preview.reportPeriodEndIso,
									generatedOnRaw: preview.generatedOnRaw,
									generatedOnDateIso: preview.generatedOnDateIso,
								}}
							/>
						</div>
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							onClick={confirmImport}
							disabled={loading || preview.parsed === 0 || preview.canConfirmImport === false}
						>
							{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
							Confirm import to database
						</Button>
						<Button size="sm" variant="outline" type="button" onClick={cancelPreview} disabled={loading}>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
