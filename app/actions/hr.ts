"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/hr/auth-route";
import { tryNormalizeHrPhone } from "@/lib/hr/phone";

export type HrEmployeeRow = {
	id: string;
	name: string;
	employee_code: string;
	phone: string | null;
	salary_type: string;
	salary_rate: number;
	overtime_rate: number;
	required_hours_per_week: number;
	grace_hours: number;
};

async function requireAdminSupabase() {
	const supabase = await createClient();
	if (!supabase) return { error: "No database" as const, supabase: null };
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user || !isAdminUser(user)) {
		return { error: "Forbidden" as const, supabase: null };
	}
	return { supabase, user };
}

export async function listHrEmployees(): Promise<HrEmployeeRow[]> {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return [];
	const { data, error } = await r.supabase.from("hr_employees").select("*").order("name");
	if (error) return [];
	return (data ?? []) as HrEmployeeRow[];
}

export async function listHrAttendance(filters?: { from?: string; to?: string }) {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return [];
	let q = r.supabase
		.from("hr_attendance")
		.select("*, hr_employees(name, employee_code)")
		.order("work_date", { ascending: false })
		.limit(1500);
	if (filters?.from) q = q.gte("work_date", filters.from);
	if (filters?.to) q = q.lte("work_date", filters.to);
	const { data, error } = await q;
	if (error) return [];
	return data ?? [];
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertYmd(label: string, v: string): string | null {
	const s = String(v ?? "").trim();
	if (!YMD_RE.test(s)) return `${label} must be YYYY-MM-DD.`;
	return null;
}

function parseYmdToUtcMidnight(s: string): number {
	const y = parseInt(s.slice(0, 4), 10);
	const m = parseInt(s.slice(5, 7), 10);
	const d = parseInt(s.slice(8, 10), 10);
	return Date.UTC(y, m - 1, d);
}

export type HrAttendanceDeletePreviewResult =
	| { ok: true; count: number }
	| { ok: false; error: string };

/** Count rows that would be removed (admin only). */
export async function previewHrAttendanceDelete(input: {
	from: string;
	to: string;
	/** Omit or null = all employees */
	employeeId?: string | null;
}): Promise<HrAttendanceDeletePreviewResult> {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return { ok: false, error: r.error ?? "Forbidden" };

	const ef = assertYmd("From date", input.from);
	if (ef) return { ok: false, error: ef };
	const et = assertYmd("To date", input.to);
	if (et) return { ok: false, error: et };
	if (parseYmdToUtcMidnight(input.from) > parseYmdToUtcMidnight(input.to)) {
		return { ok: false, error: "From date must be on or before To date." };
	}

	const empId = input.employeeId?.trim() || "";
	if (empId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(empId)) {
		return { ok: false, error: "Invalid employee id." };
	}

	let q = r.supabase
		.from("hr_attendance")
		.select("id", { count: "exact", head: true })
		.gte("work_date", input.from)
		.lte("work_date", input.to);
	if (empId) q = q.eq("employee_id", empId);

	const { count, error } = await q;
	if (error) return { ok: false, error: error.message };
	return { ok: true, count: count ?? 0 };
}

export type HrAttendanceDeleteChunkResult =
	| { ok: true; deletedInBatch: number }
	| { ok: false; error: string };

const DELETE_BATCH_SIZE = 280;

/**
 * Deletes up to DELETE_BATCH_SIZE matching rows (admin only).
 * Call repeatedly from the client until `deletedInBatch === 0` for a determinate progress bar.
 */
export async function deleteHrAttendanceChunk(input: {
	from: string;
	to: string;
	employeeId?: string | null;
}): Promise<HrAttendanceDeleteChunkResult> {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return { ok: false, error: r.error ?? "Forbidden" };

	const ef = assertYmd("From date", input.from);
	if (ef) return { ok: false, error: ef };
	const et = assertYmd("To date", input.to);
	if (et) return { ok: false, error: et };
	if (parseYmdToUtcMidnight(input.from) > parseYmdToUtcMidnight(input.to)) {
		return { ok: false, error: "From date must be on or before To date." };
	}

	const empId = input.employeeId?.trim() || "";
	if (empId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(empId)) {
		return { ok: false, error: "Invalid employee id." };
	}

	let sel = r.supabase
		.from("hr_attendance")
		.select("id")
		.gte("work_date", input.from)
		.lte("work_date", input.to)
		.limit(DELETE_BATCH_SIZE);
	if (empId) sel = sel.eq("employee_id", empId);

	const { data: rows, error: e1 } = await sel;
	if (e1) return { ok: false, error: e1.message };
	if (!rows?.length) return { ok: true, deletedInBatch: 0 };

	const ids = rows.map((x: { id: string }) => x.id).filter(Boolean);
	const { error: e2 } = await r.supabase.from("hr_attendance").delete().in("id", ids);
	if (e2) return { ok: false, error: e2.message };

	return { ok: true, deletedInBatch: ids.length };
}

/** Call once after bulk delete from the client finishes (refreshes server-rendered attendance list). */
export async function revalidateHrAttendancePage() {
	const r = await requireAdminSupabase();
	if (r.error) return { ok: false as const, error: r.error };
	revalidatePath("/hr/attendance");
	return { ok: true as const };
}

export async function listHrPayoutBatches() {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return [];
	const { data, error } = await r.supabase
		.from("hr_payout_batches")
		.select(
			"*, hr_employee_payouts(*, hr_employees(name, employee_code, salary_type, salary_rate, overtime_rate, required_hours_per_week, grace_hours, deduction_enabled))"
		)
		.order("created_at", { ascending: false })
		.limit(20);
	if (error) return [];
	return data ?? [];
}

async function assertUniqueHrPhone(
	supabase: NonNullable<Awaited<ReturnType<typeof requireAdminSupabase>>["supabase"]>,
	phoneDigits: string | null,
	excludeEmployeeId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (!phoneDigits) return { ok: true };
	const { data: existing, error } = await supabase
		.from("hr_employees")
		.select("id")
		.eq("phone", phoneDigits)
		.maybeSingle();
	if (error) return { ok: false, error: error.message };
	if (existing?.id && existing.id !== excludeEmployeeId) {
		return { ok: false, error: "This phone number is already used by another employee." };
	}
	return { ok: true };
}

/** Exact match on trimmed code (same as DB UNIQUE on `employee_code`). */
async function assertUniqueEmployeeCode(
	supabase: NonNullable<Awaited<ReturnType<typeof requireAdminSupabase>>["supabase"]>,
	employeeCode: string,
	excludeEmployeeId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	const code = employeeCode.trim();
	if (!code) return { ok: false, error: "Employee code is required." };
	const { data: existing, error } = await supabase
		.from("hr_employees")
		.select("id, employee_code")
		.eq("employee_code", code)
		.maybeSingle();
	if (error) return { ok: false, error: error.message };
	if (existing?.id && existing.id !== excludeEmployeeId) {
		return {
			ok: false,
			error: `Employee code "${existing.employee_code}" already exists. Use a different code.`,
		};
	}
	return { ok: true };
}

export async function createHrEmployee(form: {
	name: string;
	employee_code: string;
	phone?: string;
	salary_type?: string;
	salary_rate: number;
	overtime_rate?: number;
	required_hours_per_week?: number;
	grace_hours?: number;
}) {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return { success: false, error: r.error ?? "Forbidden" };
	const phoneNorm = tryNormalizeHrPhone(form.phone);
	if (!phoneNorm.ok) return { success: false, error: phoneNorm.error };
	const phone = phoneNorm.digits;
	const codeTrimmed = form.employee_code.trim();
	const [phoneCheck, codeCheck] = await Promise.all([
		assertUniqueHrPhone(r.supabase, phone),
		assertUniqueEmployeeCode(r.supabase, codeTrimmed),
	]);
	if (!phoneCheck.ok) return { success: false, error: phoneCheck.error };
	if (!codeCheck.ok) return { success: false, error: codeCheck.error };

	const { error } = await r.supabase.from("hr_employees").insert({
		name: form.name.trim(),
		employee_code: codeTrimmed,
		phone,
		salary_type: form.salary_type ?? "monthly",
		salary_rate: form.salary_rate,
		overtime_rate: form.overtime_rate ?? 0,
		required_hours_per_week: form.required_hours_per_week ?? 48,
		grace_hours: form.grace_hours ?? 0,
	});
	if (error) {
		if (error.code === "23505") {
			if (/phone/i.test(error.message)) {
				return { success: false, error: "This phone number is already used by another employee." };
			}
			if (/employee_code|hr_employees_employee_code/i.test(error.message)) {
				return { success: false, error: "This employee code already exists. Use a different code." };
			}
		}
		return { success: false, error: error.message };
	}
	revalidatePath("/hr/employees");
	return { success: true };
}

export async function updateHrEmployee(
	id: string,
	form: {
		name: string;
		employee_code: string;
		phone?: string;
		salary_type?: string;
		salary_rate: number;
		overtime_rate?: number;
		required_hours_per_week?: number;
		grace_hours?: number;
	}
) {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return { success: false, error: r.error ?? "Forbidden" };
	const phoneNorm = tryNormalizeHrPhone(form.phone);
	if (!phoneNorm.ok) return { success: false, error: phoneNorm.error };
	const phone = phoneNorm.digits;
	const codeTrimmed = form.employee_code.trim();
	const [phoneCheck, codeCheck] = await Promise.all([
		assertUniqueHrPhone(r.supabase, phone, id),
		assertUniqueEmployeeCode(r.supabase, codeTrimmed, id),
	]);
	if (!phoneCheck.ok) return { success: false, error: phoneCheck.error };
	if (!codeCheck.ok) return { success: false, error: codeCheck.error };

	const { error } = await r.supabase
		.from("hr_employees")
		.update({
			name: form.name.trim(),
			employee_code: codeTrimmed,
			phone,
			salary_type: form.salary_type ?? "monthly",
			salary_rate: form.salary_rate,
			overtime_rate: form.overtime_rate ?? 0,
			required_hours_per_week: form.required_hours_per_week ?? 48,
			grace_hours: form.grace_hours ?? 0,
		})
		.eq("id", id);
	if (error) {
		if (error.code === "23505") {
			if (/phone/i.test(error.message)) {
				return { success: false, error: "This phone number is already used by another employee." };
			}
			if (/employee_code|hr_employees_employee_code/i.test(error.message)) {
				return { success: false, error: "This employee code already exists. Use a different code." };
			}
		}
		return { success: false, error: error.message };
	}
	revalidatePath("/hr/employees");
	return { success: true };
}
