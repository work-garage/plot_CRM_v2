/**
 * Block-based attendance: dates as COLUMNS, metrics as ROWS (In Time, Out Time, Duration, OT).
 * Tolerates visual report layouts: indented labels, blank rows, "Days" headers above employees,
 * and fuzzy metric labels (in/out time, overtime, etc.).
 */

import type { ParsedAttendanceRow, HrAttendanceType } from "./types";

function norm(s: unknown): string {
	return String(s ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

const MONTHS: Record<string, number> = {
	jan: 0,
	feb: 1,
	mar: 2,
	apr: 3,
	may: 4,
	jun: 5,
	jul: 6,
	aug: 7,
	sep: 8,
	sept: 8,
	oct: 9,
	nov: 10,
	dec: 11,
};

/** Build YYYY-MM-DD from calendar parts (no UTC midnight drift). */
function toIsoDateParts(y: number, monthIndex0: number, day: number): string {
	return `${y}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse DD-MMM, DD-MMM-YYYY, Excel serial date, JS Date */
export function parseDateCell(cell: unknown, defaultYear: number): string | null {
	if (cell === "" || cell === null || cell === undefined) return null;
	if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
		return toIsoDateParts(cell.getFullYear(), cell.getMonth(), cell.getDate());
	}
	if (typeof cell === "number") {
		// Excel serial date (days since 1899-12-30) — use UTC parts so the calendar day matches Excel
		if (cell > 20000 && cell < 60000) {
			const epoch = Date.UTC(1899, 11, 30);
			const d = new Date(epoch + Math.floor(cell) * 86400000);
			return toIsoDateParts(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
		}
	}
	const s = String(cell).trim();
	if (!s) return null;
	// YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

	/** DD-MMM or DD-MMM-YY(YY) — year optional (CSV often has only "01-Mar" in column headers). */
	const m = /^(\d{1,2})[-/]([A-Za-z]{3})(?:[-/]((?:\d{2})|(?:\d{4})))?$/.exec(s);
	if (m) {
		const day = parseInt(m[1], 10);
		const mon = MONTHS[m[2].toLowerCase()];
		if (mon === undefined) return null;
		let year = defaultYear;
		if (m[3]) {
			const yRaw = m[3];
			const y = parseInt(yRaw, 10);
			if (yRaw.length === 4) {
				year = y;
			} else {
				/** Two-digit year: "01" must not become 2001 when the report is 2026 (Excel often exports YY). */
				const candidate2000 = 2000 + y;
				if (Math.abs(candidate2000 - defaultYear) > 15) {
					if (y >= 40) year = 1900 + y;
					else year = defaultYear;
				} else {
					year = candidate2000;
				}
			}
		}
		// mon is 0-based month index (Mar = 2); avoid Date.UTC + toISOString (TZ can shift the day)
		return toIsoDateParts(year, mon, day);
	}
	const d2 = new Date(s);
	if (!Number.isNaN(d2.getTime())) {
		return toIsoDateParts(d2.getFullYear(), d2.getMonth(), d2.getDate());
	}
	return null;
}

/** Excel time as fraction of day, or HH:MM string */
export function parseTimeCell(cell: unknown): string | null {
	if (cell === "" || cell === null || cell === undefined) return null;
	if (typeof cell === "number") {
		if (cell >= 0 && cell < 1) {
			const total = Math.round(cell * 24 * 60);
			const h = Math.floor(total / 60) % 24;
			const m = total % 60;
			return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
		}
		return null;
	}
	const s = String(cell).trim();
	if (!s) return null;
	if (/^0+:0{0,2}$/i.test(s) || s === "0" || s === "00:00") return "00:00";
	const mm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
	if (mm) {
		const h = Math.min(23, parseInt(mm[1], 10));
		const m = Math.min(59, parseInt(mm[2], 10));
		return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
	}
	return null;
}

/** Duration: minutes integer, or "H:MM", or decimal hours */
export function parseDurationToMinutes(cell: unknown): number | null {
	if (cell === "" || cell === null || cell === undefined) return null;
	if (typeof cell === "number") {
		if (cell >= 0 && cell < 1) {
			return Math.round(cell * 24 * 60);
		}
		if (Number.isFinite(cell)) return Math.round(cell);
		return null;
	}
	const s = String(cell).trim();
	if (!s) return null;
	const hm = /^(\d{1,2}):(\d{2})$/.exec(s);
	if (hm) {
		return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
	}
	const n = Number(s.replace(/[^0-9.-]/g, ""));
	return Number.isFinite(n) ? Math.round(n) : null;
}

function parseOvertimeMinutes(cell: unknown): number {
	const v = parseDurationToMinutes(cell);
	return v != null ? Math.max(0, v) : 0;
}

/**
 * Infer calendar year from the Work Duration report header (e.g. "01-Mar-2026 To 21-Mar-2026").
 * Ignores stray years far from the client fallback (e.g. "2001" in a template footer).
 */
export function inferDefaultYearFromMatrix(matrix: unknown[][], fallback: number): number {
	const sample = matrix
		.slice(0, 220)
		.map((r) => (r ?? []).map((c) => String(c ?? "")).join(" "))
		.join("\n");

	/** Full range on one line: 01-Mar-2026 To 21-Mar-2026 (also en dash) */
	const rangeFull =
		/\b(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})\s*(?:To|to|–|-)\s*(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})\b/.exec(
			sample
		);
	if (rangeFull) {
		const y1 = parseInt(rangeFull[3], 10);
		const y2 = parseInt(rangeFull[6], 10);
		if (y1 >= 1990 && y1 <= 2100 && y1 === y2) return y1;
		if (y1 >= 1990 && y1 <= 2100) return y1;
		if (y2 >= 1990 && y2 <= 2100) return y2;
	}

	const legacy =
		/\b(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})\s+To\b/i.exec(sample) ??
		/\bTo\s+(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})\b/i.exec(sample);
	if (legacy) {
		const y = parseInt(legacy[3], 10);
		if (y >= 1990 && y <= 2100) return y;
	}

	const years = [...sample.matchAll(/\b(19|20)\d{2}\b/g)]
		.map((x) => parseInt(x[0], 10))
		.filter((y) => y >= 1990 && y <= 2100);
	if (years.length) {
		const plausible = years.filter((y) => Math.abs(y - fallback) <= 15);
		if (plausible.length) return Math.max(...plausible);
	}

	return fallback;
}

/** Metadata from Work Duration report header rows (CSV/Excel). */
export type WorkDurationReportMetadata = {
	/** Calendar year used for header cells without a year (e.g. "01-Mar"). */
	inferredYear: number;
	/** Raw text e.g. "01-Mar-2026 To 21-Mar-2026" */
	reportPeriodRaw: string | null;
	reportPeriodStartIso: string | null;
	reportPeriodEndIso: string | null;
	/** Full "Generated On: …" line when present */
	generatedOnRaw: string | null;
	/** Date part only, YYYY-MM-DD */
	generatedOnDateIso: string | null;
};

/**
 * Reads report period + "Generated On" from the matrix (sparse CSV rows with many empty cells).
 * Strengthens the calendar year used for DD-MMM-only cells.
 */
export function parseWorkDurationReportMetadata(matrix: unknown[][], fallback: number): WorkDurationReportMetadata {
	const cellBlob = matrix
		.slice(0, 320)
		.map((r) => (r ?? []).map((c) => String(c ?? "").trim()).join(" "))
		.join("\n");

	let reportPeriodRaw: string | null = null;
	const periodLine =
		/\b(\d{1,2}[-/][A-Za-z]{3}[-/]\d{4}\s*(?:To|to|–|-)\s*\d{1,2}[-/][A-Za-z]{3}[-/]\d{4})\b/.exec(cellBlob);
	if (periodLine) reportPeriodRaw = periodLine[1]!.trim();

	let generatedOnRaw: string | null = null;
	const goLine = /(Generated\s+On:\s*[^\n]+)/i.exec(cellBlob);
	if (goLine) generatedOnRaw = goLine[1]!.trim().slice(0, 160);

	let reportPeriodStartIso: string | null = null;
	let reportPeriodEndIso: string | null = null;
	const rf = /\b(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})\s*(?:To|to|–|-)\s*(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})\b/.exec(
		cellBlob
	);
	if (rf) {
		const d1 = parseInt(rf[1], 10);
		const d2 = parseInt(rf[4], 10);
		const y1 = parseInt(rf[3], 10);
		const y2 = parseInt(rf[6], 10);
		const m1 = MONTHS[rf[2].toLowerCase()];
		const m2 = MONTHS[rf[5].toLowerCase()];
		if (m1 !== undefined && y1 >= 1990 && y1 <= 2100) reportPeriodStartIso = toIsoDateParts(y1, m1, d1);
		if (m2 !== undefined && y2 >= 1990 && y2 <= 2100) reportPeriodEndIso = toIsoDateParts(y2, m2, d2);
	}

	let generatedOnDateIso: string | null = null;
	const gm = /Generated\s*On:\s*(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})/i.exec(cellBlob);
	if (gm) {
		const d = parseInt(gm[1], 10);
		const y = parseInt(gm[3], 10);
		const mi = MONTHS[gm[2].toLowerCase()];
		if (mi !== undefined && y >= 1990 && y <= 2100) generatedOnDateIso = toIsoDateParts(y, mi, d);
	}

	let inferredYear = inferDefaultYearFromMatrix(matrix, fallback);
	const yFromRange = reportPeriodStartIso ? parseInt(reportPeriodStartIso.slice(0, 4), 10) : 0;
	const yFromGen = generatedOnDateIso ? parseInt(generatedOnDateIso.slice(0, 4), 10) : 0;
	const candidates = [inferredYear, yFromRange, yFromGen].filter((y) => y >= 1990 && y <= 2100);
	if (candidates.length) inferredYear = Math.max(...candidates);

	return {
		inferredYear,
		reportPeriodRaw,
		reportPeriodStartIso,
		reportPeriodEndIso,
		generatedOnRaw,
		generatedOnDateIso,
	};
}

function parseDaysHeaderRow(
	row: unknown[] | undefined,
	defaultYear: number
): { ok: boolean; datesByCol: (string | null)[] } {
	if (!row?.length) return { ok: false, datesByCol: [] };
	const firstRaw = String(row[0] ?? "").trim();
	const firstNorm = norm(firstRaw);
	const looksLikeDaysLabel =
		firstNorm === "days" ||
		firstNorm === "day" ||
		/^days$/i.test(firstRaw) ||
		(firstNorm.includes("days") && !firstNorm.includes("duration"));

	const datesByCol: (string | null)[] = [];
	let parsed = 0;
	for (let c = 0; c < row.length; c++) {
		const ds = parseDateCell(row[c], defaultYear);
		datesByCol[c] = ds;
		if (ds) parsed++;
	}
	if (parsed < 2) return { ok: false, datesByCol: [] };
	if (looksLikeDaysLabel) return { ok: true, datesByCol };
	// Some exports leave col A empty but put "Days" in B — still allow if enough dates
	if (!firstNorm && parsed >= 3) return { ok: true, datesByCol };
	return { ok: false, datesByCol: [] };
}

function findAllDaysHeaderRowIndices(matrix: unknown[][], defaultYear: number): number[] {
	const idx: number[] = [];
	for (let r = 0; r < matrix.length; r++) {
		if (parseDaysHeaderRow(matrix[r], defaultYear).ok) idx.push(r);
	}
	return idx;
}

export function detectHorizontalAttendanceFormat(matrix: unknown[][]): boolean {
	const limit = Math.min(matrix.length, 150);
	const y = new Date().getFullYear();
	for (let r = 0; r < limit; r++) {
		const line = (matrix[r] ?? []).map((c) => String(c ?? "")).join(" ");
		if (/employee\s*code\s*[:-]|emp\.?\s*code\s*[:-]/i.test(line)) return true;
	}
	for (let r = 0; r < limit; r++) {
		if (parseDaysHeaderRow(matrix[r], y).ok) return true;
	}
	return false;
}

function parseEmployeeHeaderRow(row: unknown[]): { code: string; name: string } {
	let code = "";
	let name = "";
	for (let i = 0; i < row.length; i++) {
		const s = String(row[i] ?? "").trim();
		const mc = /^employee\s*code\s*[:.\s-]*\s*(.+)$/i.exec(s);
		if (mc) {
			const part = mc[1].trim().replace(/^[:-]+/, "");
			const token = part.split(/\s+/)[0] ?? "";
			if (token) code = token;
		}
		const mn = /^employee\s*name\s*[:.\s-]*\s*(.+)$/i.exec(s);
		if (mn) name = mn[1].trim();
	}
	const joined = row.map((c) => String(c ?? "")).join(" ").replace(/\s+/g, " ").trim();
	if (!code) {
		const m =
			/employee\s*code\s*[:.\s.-]*\s*([\w./-]+(?:\s+[\w./-]+)?)/i.exec(joined) ??
			/employee\s*code\s*[:.\s.-]*\s*([^\s|]+)/i.exec(joined);
		if (m) code = m[1].trim().replace(/^[:-]+/, "");
	}
	if (!name) {
		const m2 =
			/employee\s*name\s*[:.\s.-]*\s*(.+?)(?=\s+employee\s*code|\s{2,}|$)/i.exec(joined) ??
			/employee\s*name\s*[:.\s.-]*\s*(.+)/i.exec(joined);
		if (m2) name = m2[1].trim();
	}
	return { code, name };
}

function findEmployeeBlockStartRows(matrix: unknown[][]): number[] {
	const starts: number[] = [];
	for (let r = 0; r < matrix.length; r++) {
		const line = (matrix[r] ?? []).map((c) => String(c ?? "")).join(" ");
		if (/employee\s*code\s*[:-]|emp\.?\s*code\s*[:-]/i.test(line)) starts.push(r);
	}
	return starts;
}

function findDateHeaderInBlock(
	block: unknown[][],
	defaultYear: number
): {
	dateRow: number;
	datesByCol: (string | null)[];
} {
	for (let r = 0; r < Math.min(block.length, 25); r++) {
		const row = block[r] ?? [];
		const datesByCol: (string | null)[] = [];
		let parsed = 0;
		for (let c = 0; c < row.length; c++) {
			const ds = parseDateCell(row[c], defaultYear);
			datesByCol[c] = ds;
			if (ds) parsed++;
		}
		if (parsed >= 2) {
			return { dateRow: r, datesByCol };
		}
	}
	return { dateRow: -1, datesByCol: [] };
}

function isRowEffectivelyEmpty(row: unknown[] | undefined): boolean {
	if (!row?.length) return true;
	for (const c of row) {
		const s = String(c ?? "").trim();
		if (s) return false;
	}
	return true;
}

/**
 * Visual reports often indent labels in column 2–5. Scan leading columns for the first label text.
 */
function getReportRowLabel(row: unknown[] | undefined, primaryScan = 8): string {
	if (!row?.length) return "";
	const limit = Math.min(primaryScan, row.length);
	for (let c = 0; c < limit; c++) {
		const s = String(row[c] ?? "").trim();
		if (s) return s;
	}
	for (let c = limit; c < Math.min(row.length, 24); c++) {
		const s = String(row[c] ?? "").trim();
		if (s && /[a-zA-Z\u00C0-\u024F]/.test(s)) return s;
	}
	return "";
}

/** Fuzzy metric match for messy report exports (spacing, case, column shifts). */
export function matchMetricRow(label: string): "in" | "out" | "duration" | "ot" | "ignore" | null {
	const raw = String(label ?? "").trim();
	if (!raw) return null;
	const l = norm(raw);
	const compact = l.replace(/\s/g, "");

	if (!compact) return null;

	// Total / T-duration rows — skip
	if (
		l.includes("t duration") ||
		compact.startsWith("tduration") ||
		/^t\s+total/.test(l) ||
		(l.includes("total") && l.includes("duration"))
	) {
		return "ignore";
	}

	// OUT before IN (avoid substring "in" inside unrelated words)
	const outPhrase =
		/\bout[\s_/:\\.-]*time\b/i.test(raw) ||
		compact.includes("outtime") ||
		(/\bout\b/.test(l) && /\btime\b/.test(l));
	if (outPhrase) return "out";

	const inPhrase =
		/\bin[\s_/:\\.-]*time\b/i.test(raw) ||
		compact.includes("intime") ||
		(/\bin\b/.test(l) && /\btime\b/.test(l) && !/\bout\b/.test(l));
	if (inPhrase) return "in";

	if (l.includes("duration") || compact.includes("duration")) {
		return "duration";
	}

	if (
		l === "ot" ||
		compact === "ot" ||
		/\bot\b/.test(l) ||
		l.includes("overtime") ||
		compact.includes("overtime") ||
		/^o\.?t\.?$/.test(compact)
	) {
		return "ot";
	}

	return null;
}

/** Use label cell(s) first, then fall back to scanning the whole row text. */
function detectMetricKindForReportRow(row: unknown[] | undefined): "in" | "out" | "duration" | "ot" | "ignore" | null {
	if (!row?.length) return null;
	const label = getReportRowLabel(row);
	let kind = matchMetricRow(label);
	if (kind) return kind;
	const joined = row.map((c) => String(c ?? "")).join(" ").trim();
	kind = matchMetricRow(joined);
	if (kind) return kind;
	// Last resort: compact joined (handles "In" "Time" in adjacent cells becoming "in time" when spaced)
	const compactJoined = norm(joined).replace(/\s/g, "");
	if (compactJoined.includes("out") && compactJoined.includes("time")) return "out";
	if (compactJoined.includes("in") && compactJoined.includes("time") && !compactJoined.includes("out"))
		return "in";
	if (compactJoined.includes("duration") && !compactJoined.includes("tduration")) return "duration";
	if (/\bot\b/i.test(joined) || /overtime/i.test(joined)) return "ot";
	return null;
}

function getRowLabel(block: unknown[][], r: number): string {
	return getReportRowLabel(block[r]);
}

function emitColumnsForEmployee(
	code: string,
	_name: string | undefined,
	datesByCol: (string | null)[],
	block: unknown[][],
	inRow: number,
	outRow: number,
	durRow: number,
	otRow: number
): ParsedAttendanceRow[] {
	const out: ParsedAttendanceRow[] = [];
	const maxCol = Math.max(
		datesByCol.length,
		inRow >= 0 ? (block[inRow]?.length ?? 0) : 0,
		outRow >= 0 ? (block[outRow]?.length ?? 0) : 0,
		durRow >= 0 ? (block[durRow]?.length ?? 0) : 0,
		otRow >= 0 ? (block[otRow]?.length ?? 0) : 0
	);

	for (let c = 0; c < maxCol; c++) {
		const work_date = datesByCol[c];
		if (!work_date) continue;

		const inRaw = inRow >= 0 ? block[inRow]?.[c] : "";
		const outRaw = outRow >= 0 ? block[outRow]?.[c] : "";
		const durRaw = durRow >= 0 ? block[durRow]?.[c] : "";
		const otRaw = otRow >= 0 ? block[otRow]?.[c] : "";

		let in_time = parseTimeCell(inRaw);
		let out_time = parseTimeCell(outRaw);
		let duration_minutes = parseDurationToMinutes(durRaw);
		let overtime_minutes = parseOvertimeMinutes(otRaw);

		if (in_time === "00:00" && (!out_time || out_time === "00:00")) {
			in_time = null;
			out_time = null;
		} else if (in_time === "00:00") {
			in_time = null;
		} else if (out_time === "00:00") {
			out_time = null;
		}

		const hasWork =
			(in_time && in_time !== "00:00") ||
			(out_time && out_time !== "00:00") ||
			(duration_minutes != null && duration_minutes > 0) ||
			overtime_minutes > 0;

		if (!hasWork) continue;

		let attendance_type: HrAttendanceType = "present";
		const is_valid: boolean =
			(duration_minutes != null && duration_minutes > 0) ||
			Boolean(in_time && out_time && in_time !== "00:00" && out_time !== "00:00");

		const row: ParsedAttendanceRow = {
			employee_code: code,
			work_date,
			in_time,
			out_time,
			duration_minutes,
			overtime_minutes,
			attendance_type,
			is_valid,
			...(_name ? { employee_name: _name } : {}),
		};
		if (!is_valid) row.error = "Check in/out or duration";
		out.push(row);
	}
	return out;
}

/**
 * Work Duration Report style: "Days" row with DD-MMM columns first, then weekday row,
 * then "Employee Code:- …", then In/Out/Duration/OT rows.
 */
function parseDaysFirstHorizontal(
	matrix: unknown[][],
	defaultYear: number
): { rows: ParsedAttendanceRow[]; errors: string[] } {
	const errors: string[] = [];
	const out: ParsedAttendanceRow[] = [];
	const daysRows = findAllDaysHeaderRowIndices(matrix, defaultYear);

	if (daysRows.length === 0) {
		return { rows: [], errors: [] };
	}

	for (let i = 0; i < daysRows.length; i++) {
		const start = daysRows[i];
		const end = i + 1 < daysRows.length ? daysRows[i + 1] : matrix.length;
		const { datesByCol } = parseDaysHeaderRow(matrix[start], defaultYear);
		if (!datesByCol.length) continue;

		let empRow = -1;
		for (let r = start + 1; r < end; r++) {
			const line = (matrix[r] ?? []).map((c) => String(c ?? "")).join(" ");
			if (/employee\s*code|emp\.?\s*code/i.test(line)) {
				empRow = r;
				break;
			}
		}
		if (empRow < 0) {
			errors.push(`Block at sheet row ${start + 1}: no Employee Code row below "Days" header`);
			continue;
		}

		const { code, name: _name } = parseEmployeeHeaderRow(matrix[empRow] ?? []);
		if (!code) {
			errors.push(`Row ${empRow + 1}: could not parse employee code (expected Employee Code:- or Code:)`);
			continue;
		}

		const block = matrix.slice(start, end);
		const relEmp = empRow - start;

		let inRow = -1;
		let outRow = -1;
		let durRow = -1;
		let otRow = -1;

		const maxMetricScan = Math.min(block.length, relEmp + 1 + 25);
		for (let r = relEmp + 1; r < maxMetricScan; r++) {
			const rowArr = block[r] ?? [];
			if (isRowEffectivelyEmpty(rowArr)) continue;

			const line = rowArr.map((c) => String(c ?? "")).join(" ");
			if (r > relEmp + 1 && /employee\s*code|emp\.?\s*code/i.test(line)) break;

			// Skip obvious non-metric header rows (weekday names) without dropping the whole block
			const labelOnly = getReportRowLabel(rowArr);
			if (labelOnly && /^(sun|mon|tue|wed|thu|fri|sat)\b/i.test(norm(labelOnly))) {
				const dateLike = (rowArr ?? []).filter((c) => parseDateCell(c, defaultYear)).length;
				if (dateLike < 2) continue;
			}

			const kind = detectMetricKindForReportRow(rowArr);
			if (kind === null || kind === "ignore") continue;
			if (kind === "in" && inRow < 0) inRow = r;
			else if (kind === "out" && outRow < 0) outRow = r;
			else if (kind === "duration" && durRow < 0) durRow = r;
			else if (kind === "ot" && otRow < 0) otRow = r;
		}

		for (let r = maxMetricScan; r < block.length; r++) {
			if (inRow >= 0 && outRow >= 0 && durRow >= 0) break;
			const rowArr = block[r] ?? [];
			if (isRowEffectivelyEmpty(rowArr)) continue;
			const line = rowArr.map((c) => String(c ?? "")).join(" ");
			if (/employee\s*code|emp\.?\s*code/i.test(line)) break;

			const kind = detectMetricKindForReportRow(rowArr);
			if (kind === null || kind === "ignore") continue;
			if (kind === "in" && inRow < 0) inRow = r;
			else if (kind === "out" && outRow < 0) outRow = r;
			else if (kind === "duration" && durRow < 0) durRow = r;
			else if (kind === "ot" && otRow < 0) otRow = r;
		}

		if (inRow < 0 && outRow < 0 && durRow < 0) {
			errors.push(
				`Employee ${code}: no In/Out/Duration rows found below employee row (sheet row ${empRow + 1})`
			);
			continue;
		}

		out.push(
			...emitColumnsForEmployee(code, _name, datesByCol, block, inRow, outRow, durRow, otRow)
		);
	}

	return { rows: out, errors };
}

/** Legacy: employee header row first, then date row + metrics below it. */
function parseEmployeeFirstHorizontal(
	matrix: unknown[][],
	defaultYear: number
): { rows: ParsedAttendanceRow[]; errors: string[] } {
	const errors: string[] = [];
	const out: ParsedAttendanceRow[] = [];
	const starts = findEmployeeBlockStartRows(matrix);

	if (starts.length === 0) {
		return { rows: [], errors: ['No blocks found. Expected a row containing "Employee Code:"'] };
	}

	for (let bi = 0; bi < starts.length; bi++) {
		const start = starts[bi];
		const end = bi + 1 < starts.length ? starts[bi + 1] : matrix.length;
		const { code, name: _name } = parseEmployeeHeaderRow(matrix[start] ?? []);
		if (!code) {
			errors.push(`Row ${start + 1}: could not parse employee code`);
			continue;
		}

		const block = matrix.slice(start + 1, end);
		const { dateRow, datesByCol } = findDateHeaderInBlock(block, defaultYear);
		if (dateRow < 0) {
			errors.push(`Employee ${code}: could not find a date header row (need ≥2 date columns)`);
			continue;
		}

		let inRow = -1;
		let outRow = -1;
		let durRow = -1;
		let otRow = -1;

		for (let r = dateRow + 1; r < block.length; r++) {
			const rowArr = block[r] ?? [];
			if (isRowEffectivelyEmpty(rowArr)) continue;
			const kind = detectMetricKindForReportRow(rowArr);
			if (kind === null || kind === "ignore") continue;
			if (kind === "in" && inRow < 0) inRow = r;
			else if (kind === "out" && outRow < 0) outRow = r;
			else if (kind === "duration" && durRow < 0) durRow = r;
			else if (kind === "ot" && otRow < 0) otRow = r;
		}

		if (inRow < 0 && outRow < 0 && durRow < 0) {
			errors.push(`Employee ${code}: no In/Out/Duration rows found below date row`);
			continue;
		}

		out.push(
			...emitColumnsForEmployee(code, _name, datesByCol, block, inRow, outRow, durRow, otRow)
		);
	}

	return { rows: out, errors };
}

export function parseHorizontalBlockAttendance(
	matrix: unknown[][],
	defaultYear: number
): { rows: ParsedAttendanceRow[]; errors: string[] } {
	const year = parseWorkDurationReportMetadata(matrix, defaultYear).inferredYear;
	const daysRows = findAllDaysHeaderRowIndices(matrix, year);
	const empStarts = findEmployeeBlockStartRows(matrix);
	const firstEmp = empStarts.length ? empStarts[0] : Number.POSITIVE_INFINITY;
	const firstDay = daysRows.length ? daysRows[0] : Number.POSITIVE_INFINITY;
	/** Work Duration Report has calendar ("Days" + dates) above the employee row. */
	const useDaysFirst =
		daysRows.length > 0 && (firstEmp === Number.POSITIVE_INFINITY || firstDay < firstEmp);

	if (useDaysFirst) {
		const { rows, errors } = parseDaysFirstHorizontal(matrix, year);
		if (rows.length > 0 || errors.length > 0) {
			return { rows, errors };
		}
	}

	return parseEmployeeFirstHorizontal(matrix, year);
}
