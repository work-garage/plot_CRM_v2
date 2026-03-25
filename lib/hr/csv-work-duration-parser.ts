/**
 * Robust parser for messy "Work Duration Report" layouts (non-tabular, blocks per employee).
 * Input is a 2D cell matrix from **CSV** or **Excel** (same structure after `sheet_to_json`).
 * Does not rely on fixed row indices; tolerates shifted labels, (SE) suffixes, blank rows.
 */

import type { ParsedAttendanceRow, HrAttendanceType } from "./types";
import {
	parseDateCell,
	parseWorkDurationReportMetadata,
	type WorkDurationReportMetadata,
} from "./excel-parser-horizontal";

export type { WorkDurationReportMetadata };

export type DateColumn = { colIndex: number; raw: string; work_date: string };

/** Strip parenthetical tags e.g. (SE), [AM] */
export function cleanCsvCell(v: unknown): string {
	return String(v ?? "")
		.replace(/\(.*?\)/g, "")
		.replace(/\[[^\]]*\]/g, "")
		.trim();
}

function joinRow(row: unknown[]): string {
	return (row ?? []).map((c) => String(c ?? "")).join(" ");
}

function firstNonEmptyCell(row: unknown[]): string {
	for (const c of row ?? []) {
		const t = String(c ?? "").trim();
		if (t) return t;
	}
	return "";
}

export function extractDateColumnsFromRow(
	row: unknown[] | undefined,
	defaultYear: number
): DateColumn[] {
	if (!row?.length) return [];
	const out: DateColumn[] = [];
	for (let c = 0; c < row.length; c++) {
		const iso = parseDateCell(row[c], defaultYear);
		if (iso) out.push({ colIndex: c, raw: String(row[c]).trim(), work_date: iso });
	}
	return out;
}

function findGlobalDateRow(matrix: unknown[][], year: number): DateColumn[] | null {
	for (let r = 0; r < matrix.length; r++) {
		const cols = extractDateColumnsFromRow(matrix[r], year);
		if (cols.length >= 3) return cols;
	}
	return null;
}

function findDateColumnsAbove(
	matrix: unknown[][],
	empRow: number,
	year: number,
	fallback: DateColumn[] | null
): DateColumn[] | null {
	for (let r = empRow - 1; r >= Math.max(0, empRow - 60); r--) {
		const cols = extractDateColumnsFromRow(matrix[r], year);
		if (cols.length >= 3) return cols;
	}
	return fallback;
}

function parseEmployeeFromRow(row: unknown[]): { code: string; name: string } {
	const joined = joinRow(row).replace(/\s+/g, " ");
	let code = "";
	const cm = /employee\s*code\s*[:.\s-]*\s*([\w./-]+)/i.exec(joined);
	if (cm) code = cm[1]!.trim();
	let name = "";
	const nm =
		/employee\s*name\s*[:.\s-]*\s*(.+?)(?=\s+employee\s*code|$)/i.exec(joined) ??
		/employee\s*name\s*[:.\s-]*\s*(.+)/i.exec(joined);
	if (nm) name = nm[1]!.trim();
	return { code, name };
}

type MetricKind = "in" | "out" | "dur" | "ot";

function classifyMetricLabel(label: string): MetricKind | null {
	const l = label.toLowerCase().replace(/\s+/g, " ");
	const compact = l.replace(/\s/g, "");
	if (/^t\s*duration|^tduration\b/.test(l) || (l.includes("total") && l.includes("duration")))
		return null;
	if (l.includes("out") && (l.includes("time") || compact.includes("outtime"))) return "out";
	if (
		(l.includes("in") && l.includes("time") && !l.includes("out")) ||
		(compact.includes("intime") && !compact.includes("out"))
	)
		return "in";
	if (l.includes("duration") && !/^t\s*duration/.test(l)) return "dur";
	if (l === "ot" || /\bot\b/.test(l) || l.includes("overtime") || compact === "ot") return "ot";
	return null;
}

function scanMetricRows(
	matrix: unknown[][],
	startRow: number,
	maxScan: number,
	year: number
): Record<MetricKind, number | null> {
	const res: Record<MetricKind, number | null> = { in: null, out: null, dur: null, ot: null };
	for (let i = startRow; i < matrix.length && i < startRow + maxScan; i++) {
		const row = matrix[i] ?? [];
		const joined = joinRow(row);
		if (/employee\s*code/i.test(joined)) break;
		if (extractDateColumnsFromRow(row, year).length >= 3) break;

		const label = firstNonEmptyCell(row);
		if (!label) continue;
		const kind = classifyMetricLabel(label);
		if (!kind) continue;
		if (res[kind] === null) res[kind] = i;
	}
	return res;
}

export function parseTimeFromCsvCell(cell: unknown): string | null {
	const s = cleanCsvCell(cell);
	if (!s || s === "00:00" || /^0+:0{0,2}$/i.test(s)) return null;
	if (typeof cell === "number" && cell >= 0 && cell < 1) {
		const total = Math.round(cell * 24 * 60);
		const h = Math.floor(total / 60) % 24;
		const m = total % 60;
		return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
	}
	const m = /^(\d{1,2}):(\d{2})/.exec(s);
	if (!m) return null;
	const hh = Math.min(23, parseInt(m[1]!, 10));
	const mm = Math.min(59, parseInt(m[2]!, 10));
	return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function parseDurationOrOtMinutes(cell: unknown): number {
	const s = cleanCsvCell(cell);
	if (!s || s === "00:00") return 0;
	const hm = /^(\d{1,2}):(\d{2})$/.exec(s);
	if (hm) return parseInt(hm[1]!, 10) * 60 + parseInt(hm[2]!, 10);
	const n = Number(s.replace(/[^\d.-]/g, ""));
	if (Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(s.trim())) return Math.round(n);
	return 0;
}

/**
 * Parse full matrix (from CSV text → string[][]) into normalized attendance rows.
 */
export function parseWorkDurationCsvMatrix(
	matrix: unknown[][],
	options?: { defaultYear?: number }
): {
	rows: ParsedAttendanceRow[];
	errors: string[];
	inferredYear: number;
	reportMetadata: WorkDurationReportMetadata;
} {
	const errors: string[] = [];
	const results: ParsedAttendanceRow[] = [];
	const defaultYear = options?.defaultYear ?? new Date().getFullYear();
	const reportMetadata = parseWorkDurationReportMetadata(matrix, defaultYear);
	const year = reportMetadata.inferredYear;
	const globalDates = findGlobalDateRow(matrix, year);

	if (!globalDates) {
		errors.push("No date header row found (need ≥3 DD-MMM or ISO date cells in one row).");
	}

	for (let r = 0; r < matrix.length; r++) {
		const row = matrix[r] ?? [];
		const joined = joinRow(row).toLowerCase();
		if (!joined.includes("employee code")) continue;

		const { code, name } = parseEmployeeFromRow(row);
		if (!code) {
			errors.push(`Row ${r + 1}: could not read employee code`);
			continue;
		}

		const dateCols = findDateColumnsAbove(matrix, r, year, globalDates);
		if (!dateCols || dateCols.length < 2) {
			errors.push(`Employee ${code}: no date columns found above this block`);
			continue;
		}

		const metrics = scanMetricRows(matrix, r + 1, 32, year);
		if (metrics.in == null && metrics.out == null && metrics.dur == null) {
			errors.push(`Employee ${code}: no In / Out / Duration rows found below header`);
			continue;
		}

		for (const dc of dateCols) {
			const c = dc.colIndex;
			const in_t = metrics.in != null ? parseTimeFromCsvCell(matrix[metrics.in]![c]) : null;
			const out_t = metrics.out != null ? parseTimeFromCsvCell(matrix[metrics.out]![c]) : null;
			const duration = metrics.dur != null ? parseDurationOrOtMinutes(matrix[metrics.dur]![c]) : 0;
			const ot = metrics.ot != null ? parseDurationOrOtMinutes(matrix[metrics.ot]![c]) : 0;

			if (!in_t && !out_t && duration === 0 && ot === 0) continue;

			const onlyIn = Boolean(in_t) && !out_t;
			const onlyOut = Boolean(out_t) && !in_t;
			const hasBothTimes = Boolean(in_t && out_t);
			const is_valid = !onlyIn && !onlyOut && (duration > 0 || hasBothTimes);

			const attendance_type: HrAttendanceType = "present";
			const rec: ParsedAttendanceRow = {
				employee_code: code,
				employee_name: name || undefined,
				work_date: dc.work_date,
				in_time: in_t,
				out_time: out_t,
				duration_minutes: duration > 0 ? duration : null,
				overtime_minutes: Math.max(0, ot),
				attendance_type,
				is_valid,
			};
			if (!is_valid)
				rec.error = onlyIn || onlyOut ? "Missing in or out time" : "Check duration / times";
			results.push(rec);
		}
	}

	return { rows: results, errors, inferredYear: year, reportMetadata };
}
