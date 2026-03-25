import type { ParsedAttendanceRow } from "./types";
import type { HrAttendanceType } from "./types";

export type AttendancePreviewRow = {
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

function buildPreviewRows(rows: ParsedAttendanceRow[], cap = 500): AttendancePreviewRow[] {
	return rows.slice(0, cap).map((r) => ({
		employee_code: r.employee_code,
		employee_name: r.employee_name,
		work_date: r.work_date,
		in_time: r.in_time,
		out_time: r.out_time,
		duration_minutes: r.duration_minutes,
		overtime_minutes: r.overtime_minutes,
		attendance_type: r.attendance_type,
		is_valid: r.is_valid,
		error: r.error,
	}));
}

function normalizeAttendanceType(t: string | undefined): HrAttendanceType {
	if (t === "leave" || t === "holiday") return t;
	return "present";
}

/** Case-insensitive, collapse spaces — for matching file name vs HR name */
export function normalizePersonName(s: string | null | undefined): string {
	return String(s ?? "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

export type HrEmployeeRef = { id: string; employee_code: string; name: string };

/** Map many possible Excel code strings to employee UUID (e.g. "1", "01", "001"). */
export function buildEmployeeCodeLookup(emps: Array<{ id: string; employee_code: string }>): Map<string, string> {
	const m = new Map<string, string>();
	for (const e of emps) {
		const raw = String(e.employee_code ?? "").trim();
		if (!raw) continue;
		m.set(raw, e.id);
		const digits = raw.replace(/\D/g, "");
		if (digits) {
			m.set(digits, e.id);
			const n = parseInt(digits, 10);
			if (!Number.isNaN(n)) {
				m.set(String(n), e.id);
				for (const w of [2, 3, 4]) {
					m.set(String(n).padStart(w, "0"), e.id);
				}
			}
		}
	}
	return m;
}

export function resolveEmployeeId(lookup: Map<string, string>, code: string): string | undefined {
	const raw = String(code ?? "").trim();
	if (!raw) return undefined;
	if (lookup.has(raw)) return lookup.get(raw);
	const digits = raw.replace(/\D/g, "");
	if (digits && lookup.has(digits)) return lookup.get(digits);
	const n = parseInt(digits, 10);
	if (!Number.isNaN(n) && lookup.has(String(n))) return lookup.get(String(n));
	return undefined;
}

/**
 * Legacy: validates entire file (all codes). Prefer {@link partitionAttendanceRowsForSave} for partial imports.
 */
export function validateHrEmployeesForAttendance(
	emps: HrEmployeeRef[],
	rows: ParsedAttendanceRow[]
): { ok: boolean; errors: string[] } {
	const { skipped } = partitionAttendanceRowsForSave(emps, rows);
	if (skipped.length === 0) return { ok: true, errors: [] };
	return {
		ok: false,
		errors: skipped.map((s) => `${s.work_date} [${s.employee_code}]: ${s.reason}`),
	};
}

export type AttendanceRowSkip = {
	employee_code: string;
	/** Name as in the uploaded file (when present). */
	employee_name?: string;
	work_date: string;
	reason: string;
};

function classifySkipReason(reason: string): "unknown" | "mismatch" | "missing_name" | "missing_code" | "other" {
	if (/Missing employee code/i.test(reason)) return "missing_code";
	if (/Unknown employee code/i.test(reason)) return "unknown";
	if (/Name mismatch/i.test(reason)) return "mismatch";
	if (/Missing name in file/i.test(reason)) return "missing_name";
	return "other";
}

/**
 * Short UI copy: one block instead of one line per skipped row.
 */
export function summarizeHrSkippedAttendance(skipped: AttendanceRowSkip[]): string {
	if (skipped.length === 0) return "";

	const byCode = new Map<
		string,
		{ code: string; name?: string; rowCount: number; kinds: Set<ReturnType<typeof classifySkipReason>> }
	>();
	for (const s of skipped) {
		const code = String(s.employee_code ?? "").trim() || "—";
		const kind = classifySkipReason(s.reason);
		const ex = byCode.get(code);
		if (ex) {
			ex.rowCount++;
			ex.kinds.add(kind);
			if (s.employee_name && !ex.name) ex.name = s.employee_name;
		} else {
			byCode.set(code, {
				code,
				name: s.employee_name,
				rowCount: 1,
				kinds: new Set([kind]),
			});
		}
	}

	const whyShort = (kinds: Set<ReturnType<typeof classifySkipReason>>) => {
		const parts: string[] = [];
		if (kinds.has("unknown")) parts.push("not in HR");
		if (kinds.has("mismatch")) parts.push("name does not match HR");
		if (kinds.has("missing_name")) parts.push("missing name in file");
		if (kinds.has("missing_code")) parts.push("missing code");
		if (kinds.has("other") && parts.length === 0) parts.push("could not match HR");
		return parts.join("; ") || "could not match HR";
	};

	const empBits = [...byCode.values()].map((e) => {
		const label = e.name ? `${e.name} (code ${e.code})` : `code ${e.code}`;
		return `${label}: ${e.rowCount} day row(s) — ${whyShort(e.kinds)}`;
	});

	const n = byCode.size;
	const intro =
		n === 1
			? "Attendance cannot be saved for 1 employee from this file:"
			: `Attendance cannot be saved for ${n} employees from this file:`;

	return `${intro} ${empBits.join(" · ")}. Add them under HR → Employees (or fix codes/names) and import again.`;
}

/**
 * Per-row HR match: code must resolve to an employee and file name must match HR (case-insensitive).
 * Rows that fail are listed in `skipped`; matching rows are in `accepted` (partial save).
 */
export function partitionAttendanceRowsForSave(
	emps: HrEmployeeRef[],
	rows: ParsedAttendanceRow[]
): { accepted: ParsedAttendanceRow[]; skipped: AttendanceRowSkip[] } {
	const lookup = buildEmployeeCodeLookup(emps);
	const byId = new Map(emps.map((e) => [e.id, e]));
	const accepted: ParsedAttendanceRow[] = [];
	const skipped: AttendanceRowSkip[] = [];

	for (const r of rows) {
		const code = String(r.employee_code ?? "").trim();
		const wd = r.work_date;
		if (!code) {
			skipped.push({
				employee_code: code || "—",
				employee_name: r.employee_name,
				work_date: wd,
				reason: "Missing employee code",
			});
			continue;
		}
		const eid = resolveEmployeeId(lookup, code);
		if (!eid) {
			skipped.push({
				employee_code: code,
				employee_name: r.employee_name,
				work_date: wd,
				reason: `Unknown employee code (not in HR): ${code}`,
			});
			continue;
		}
		const emp = byId.get(eid);
		if (!emp) {
			skipped.push({
				employee_code: code,
				employee_name: r.employee_name,
				work_date: wd,
				reason: `Unknown employee: ${code}`,
			});
			continue;
		}
		const fileNameNorm = normalizePersonName(r.employee_name);
		const hrNameNorm = normalizePersonName(emp.name);
		if (!fileNameNorm) {
			skipped.push({
				employee_code: code,
				employee_name: r.employee_name,
				work_date: wd,
				reason: `Missing name in file for code ${code} (HR: "${emp.name}")`,
			});
			continue;
		}
		if (fileNameNorm !== hrNameNorm) {
			skipped.push({
				employee_code: code,
				employee_name: r.employee_name,
				work_date: wd,
				reason: `Name mismatch for ${code}: file "${r.employee_name ?? ""}" vs HR "${emp.name}"`,
			});
			continue;
		}
		accepted.push(r);
	}
	return { accepted, skipped };
}

type UpsertRow = {
	employee_id: string;
	work_date: string;
	in_time: string | null;
	out_time: string | null;
	duration_minutes: number | null;
	overtime_minutes: number;
	attendance_type: HrAttendanceType;
	is_valid: boolean;
};

function toUpsertRow(r: ParsedAttendanceRow, employeeId: string): UpsertRow {
	return {
		employee_id: employeeId,
		work_date: r.work_date,
		in_time: r.in_time && r.in_time !== "00:00" ? r.in_time : null,
		out_time: r.out_time && r.out_time !== "00:00" ? r.out_time : null,
		duration_minutes: r.duration_minutes,
		overtime_minutes: Math.max(0, r.overtime_minutes ?? 0),
		attendance_type: normalizeAttendanceType(r.attendance_type),
		is_valid: Boolean(r.is_valid),
	};
}

const BATCH = 150;

function attendanceRowKey(r: Pick<UpsertRow, "employee_id" | "work_date">): string {
	return `${r.employee_id}|${r.work_date}`;
}

/** Keys already stored for the same employees × dates as this chunk (for insert vs update counts). */
async function fetchExistingAttendanceKeys(
	supabase: { from: (t: string) => any },
	chunk: UpsertRow[]
): Promise<Set<string>> {
	const dates = [...new Set(chunk.map((c) => c.work_date))];
	const empIds = [...new Set(chunk.map((c) => c.employee_id))];
	if (dates.length === 0 || empIds.length === 0) return new Set();

	const { data, error } = await supabase
		.from("hr_attendance")
		.select("employee_id, work_date")
		.in("work_date", dates)
		.in("employee_id", empIds);

	if (error || !data?.length) return new Set();
	return new Set((data as { employee_id: string; work_date: string }[]).map((r) => attendanceRowKey(r)));
}

function countInsertVsUpdate(chunk: UpsertRow[], existingKeys: Set<string>): { created: number; updated: number } {
	let created = 0;
	let updated = 0;
	for (const r of chunk) {
		if (existingKeys.has(attendanceRowKey(r))) updated++;
		else created++;
	}
	return { created, updated };
}

const emptyUpsertResult = (previewRows: AttendancePreviewRow[]) =>
	({
		inserted: 0,
		attendanceCreated: 0,
		attendanceUpdated: 0,
		errors: [] as string[],
		previewRows,
	}) as const;

/**
 * Upsert parsed attendance rows (already filtered to HR-matched rows if using partial import).
 * Merges on `(employee_id, work_date)`: new keys insert, existing keys update. Rows in DB outside this file are untouched.
 */
export async function upsertParsedAttendanceRows(
	supabase: { from: (t: string) => any },
	rows: ParsedAttendanceRow[],
	options?: { hrEmployees?: HrEmployeeRef[] }
): Promise<{
	/** Total rows successfully written (new + updated); kept name for older clients */
	inserted: number;
	attendanceCreated: number;
	attendanceUpdated: number;
	errors: string[];
	previewRows: AttendancePreviewRow[];
}> {
	let list: HrEmployeeRef[];
	if (options?.hrEmployees) {
		list = options.hrEmployees;
	} else {
		const { data: emps, error: e2 } = await supabase.from("hr_employees").select("id, employee_code, name");
		if (e2) {
			return {
				...emptyUpsertResult(buildPreviewRows(rows)),
				errors: [e2.message],
			};
		}
		list = (emps ?? []) as HrEmployeeRef[];
	}
	const lookup = buildEmployeeCodeLookup(list);

	const insertErrors: string[] = [];
	let totalSaved = 0;
	let attendanceCreated = 0;
	let attendanceUpdated = 0;

	const prepared: UpsertRow[] = [];

	for (const r of rows) {
		const eid = resolveEmployeeId(lookup, r.employee_code);
		if (!eid) {
			insertErrors.push(`Unknown employee code: ${r.employee_code}`);
			continue;
		}
		prepared.push(toUpsertRow(r, eid));
	}

	/** Last row wins per employee + day (same as upsert semantics). */
	const deduped = [...new Map(prepared.map((r) => [attendanceRowKey(r), r])).values()];

	for (let i = 0; i < deduped.length; i += BATCH) {
		const chunk = deduped.slice(i, i + BATCH);
		const existingKeys = await fetchExistingAttendanceKeys(supabase, chunk);
		const { created, updated } = countInsertVsUpdate(chunk, existingKeys);

		const { error } = await supabase.from("hr_attendance").upsert(chunk, {
			onConflict: "employee_id,work_date",
		});
		if (!error) {
			totalSaved += chunk.length;
			attendanceCreated += created;
			attendanceUpdated += updated;
			continue;
		}

		for (const row of chunk) {
			const { data: prior } = await supabase
				.from("hr_attendance")
				.select("id")
				.eq("employee_id", row.employee_id)
				.eq("work_date", row.work_date)
				.maybeSingle();

			const { error: rowErr } = await supabase.from("hr_attendance").upsert(row, {
				onConflict: "employee_id,work_date",
			});
			if (rowErr) {
				insertErrors.push(`${row.work_date} (${row.employee_id.slice(0, 8)}…): ${rowErr.message}`);
			} else {
				totalSaved++;
				if (prior?.id) attendanceUpdated++;
				else attendanceCreated++;
			}
		}
	}

	return {
		inserted: totalSaved,
		attendanceCreated,
		attendanceUpdated,
		errors: insertErrors,
		previewRows: buildPreviewRows(rows),
	};
}
