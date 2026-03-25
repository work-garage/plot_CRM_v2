import type { ParsedAttendanceRow, HrAttendanceType } from "./types";
import { readSheetMatrixFromBuffer } from "./excel-matrix";
import {
	detectHorizontalAttendanceFormat,
	parseHorizontalBlockAttendance,
} from "./excel-parser-horizontal";

function norm(s: unknown): string {
	return String(s ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

function mapType(t: string): HrAttendanceType {
	const x = norm(t);
	if (x === "leave" || x === "l") return "leave";
	if (x === "holiday" || x === "h") return "holiday";
	return "present";
}

/**
 * Normalized sheet: header row then data rows.
 * Expected columns (case-insensitive): Employee Code, Date, In, Out, Duration (min), OT (min), Type
 */
export function parseVerticalAttendanceTable(matrix: unknown[][]): {
	rows: ParsedAttendanceRow[];
	errors: string[];
} {
	const errors: string[] = [];

	if (!matrix.length) {
		return { rows: [], errors: ["Empty sheet"] };
	}

	const headerRow = matrix[0].map((c) => norm(c));
	const colIndex: Record<string, number> = {};
	headerRow.forEach((h, i) => {
		if (h.includes("employee") && h.includes("code")) colIndex.code = i;
		else if (h === "date" || h.includes("work date")) colIndex.date = i;
		else if (h === "in" || h.includes("in time")) colIndex.in = i;
		else if (h === "out" || h.includes("out time")) colIndex.out = i;
		else if (h.includes("duration") && !h.includes("t duration")) colIndex.duration = i;
		else if (h === "ot" || h.includes("overtime")) colIndex.ot = i;
		else if (h === "type") colIndex.type = i;
	});

	if (colIndex.code === undefined || colIndex.date === undefined) {
		return {
			rows: [],
			errors: [
				"Could not find required columns. Use: Employee Code, Date, and optionally In, Out, Duration (min), OT (min), Type — or use block format with Employee Code: rows.",
			],
		};
	}

	const rows: ParsedAttendanceRow[] = [];
	for (let r = 1; r < matrix.length; r++) {
		const line = matrix[r];
		const code = line[colIndex.code];
		const dateCell = line[colIndex.date];
		if (!code || !dateCell) continue;

		const otRaw = colIndex.ot !== undefined ? line[colIndex.ot] : "";
		const durRaw = colIndex.duration !== undefined ? line[colIndex.duration] : "";

		let duration_minutes: number | null = null;
		if (durRaw !== "" && durRaw !== undefined && durRaw !== null) {
			const n = Number(String(durRaw).replace(/[^0-9.-]/g, ""));
			if (Number.isFinite(n)) duration_minutes = Math.round(n);
		}

		let overtime_minutes = 0;
		if (otRaw !== "" && otRaw !== undefined && otRaw !== null) {
			const n = Number(String(otRaw).replace(/[^0-9.-]/g, ""));
			if (Number.isFinite(n)) overtime_minutes = Math.round(n);
		}

		const inTime =
			colIndex.in !== undefined && line[colIndex.in]
				? String(line[colIndex.in]).trim()
				: null;
		const outTime =
			colIndex.out !== undefined && line[colIndex.out]
				? String(line[colIndex.out]).trim()
				: null;

		const typeStr =
			colIndex.type !== undefined && line[colIndex.type]
				? String(line[colIndex.type])
				: "present";
		const attendance_type = mapType(typeStr);

		let work_date = "";
		if (dateCell instanceof Date) {
			work_date = dateCell.toISOString().slice(0, 10);
		} else {
			const d = new Date(String(dateCell));
			if (!Number.isNaN(d.getTime())) work_date = d.toISOString().slice(0, 10);
			else {
				const s = String(dateCell).trim();
				if (/^\d{4}-\d{2}-\d{2}$/.test(s)) work_date = s;
				else {
					errors.push(`Row ${r + 1}: invalid date ${dateCell}`);
					continue;
				}
			}
		}

		const is_valid: boolean =
			attendance_type === "leave" ||
			attendance_type === "holiday" ||
			Boolean(inTime && outTime) ||
			(duration_minutes != null && duration_minutes >= 0);

		const row: ParsedAttendanceRow = {
			employee_code: String(code).trim(),
			work_date,
			in_time: inTime,
			out_time: outTime,
			duration_minutes,
			overtime_minutes,
			attendance_type,
			is_valid,
		};
		if (!is_valid) row.error = "Missing in/out or duration for present row";
		rows.push(row);
	}

	return { rows, errors };
}

export function parseAttendanceExcelBuffer(buffer: ArrayBuffer): {
	rows: ParsedAttendanceRow[];
	errors: string[];
} {
	const matrix = readSheetMatrixFromBuffer(buffer);
	return parseVerticalAttendanceTable(matrix);
}

export type ParseAttendanceFormat = "horizontal" | "vertical";

/**
 * Tries horizontal (block) format first if the sheet contains "Employee Code:".
 * Otherwise parses vertical table format.
 */
/**
 * Same as buffer path but accepts an in-memory matrix (e.g. from JSON import or inspect pipeline).
 */
export function parseAttendanceExcelFromMatrix(
	matrix: unknown[][],
	options?: { defaultYear?: number }
): {
	rows: ParsedAttendanceRow[];
	errors: string[];
	format: ParseAttendanceFormat;
} {
	const defaultYear = options?.defaultYear ?? new Date().getFullYear();

	if (detectHorizontalAttendanceFormat(matrix)) {
		const { rows, errors } = parseHorizontalBlockAttendance(matrix, defaultYear);
		return { rows, errors, format: "horizontal" };
	}

	const { rows, errors } = parseVerticalAttendanceTable(matrix);
	return { rows, errors, format: "vertical" };
}

export function parseAttendanceExcelAuto(
	buffer: ArrayBuffer,
	options?: { defaultYear?: number }
): {
	rows: ParsedAttendanceRow[];
	errors: string[];
	format: ParseAttendanceFormat;
} {
	const matrix = readSheetMatrixFromBuffer(buffer);
	return parseAttendanceExcelFromMatrix(matrix, options);
}
