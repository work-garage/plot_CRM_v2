import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/hr/auth-route";
import { buildWeeklyBuckets, computePayoutForEmployee, formatYmdLocal } from "@/lib/hr/salary-engine";
import type { HrEmployeeRow } from "@/lib/hr/types";

function monthRange(ym: string): { start: Date; end: Date; label: string } | null {
	const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]) - 1;
	const start = new Date(y, mo, 1);
	start.setHours(0, 0, 0, 0);
	const end = new Date(y, mo + 1, 0, 23, 59, 59, 999);
	const label = start.toLocaleString("en-IN", { month: "long", year: "numeric" });
	return { start, end, label };
}

export async function POST(req: Request) {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const body = await req.json().catch(() => null);
	const ym = body?.month as string | undefined;
	if (!ym) {
		return NextResponse.json({ error: "month (YYYY-MM) required" }, { status: 400 });
	}
	const range = monthRange(ym);
	if (!range) {
		return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
	}

	const { data: employees, error: e1 } = await auth.supabase.from("hr_employees").select("*");
	if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

	const fromStr = range.start.toISOString().slice(0, 10);
	const toStr = range.end.toISOString().slice(0, 10);

	const { data: attRows, error: e2 } = await auth.supabase
		.from("hr_attendance")
		.select("*")
		.gte("work_date", fromStr)
		.lte("work_date", toStr);

	if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

	const { data: existing } = await auth.supabase
		.from("hr_payout_batches")
		.select("id")
		.eq("month_label", range.label)
		.maybeSingle();

	let batchId = existing?.id as string | undefined;
	if (!batchId) {
		const { data: ins, error: e3 } = await auth.supabase
			.from("hr_payout_batches")
			.insert({
				month_label: range.label,
				status: "draft",
				created_by: auth.user.id,
			})
			.select("id")
			.single();
		if (e3) return NextResponse.json({ error: e3.message }, { status: 400 });
		batchId = ins!.id as string;
	} else {
		await auth.supabase.from("hr_employee_payouts").delete().eq("batch_id", batchId);
	}

	const employeesList = employees ?? [];
	for (const empRaw of employeesList) {
		const emp: HrEmployeeRow = {
			id: empRaw.id,
			name: empRaw.name,
			employee_code: empRaw.employee_code,
			phone: empRaw.phone,
			salary_type: empRaw.salary_type,
			salary_rate: Number(empRaw.salary_rate),
			overtime_rate: Number(empRaw.overtime_rate),
			required_hours_per_week: Number(empRaw.required_hours_per_week),
			grace_hours: Number(empRaw.grace_hours ?? 0),
			deduction_enabled: empRaw.deduction_enabled !== false,
		};

		const mine = (attRows ?? []).filter((a: any) => a.employee_id === emp.id);
		const dailyWorked: Record<string, number> = {};
		const dailyOt: Record<string, number> = {};
		const dailyType: Record<string, "present" | "leave" | "holiday"> = {};

		let presentDays = 0;
		for (const a of mine) {
			const key = a.work_date;
			const t = a.attendance_type as "present" | "leave" | "holiday";
			dailyType[key] = t;
			if (t === "leave" || t === "holiday") continue;
			const h = (Number(a.duration_minutes ?? 0) || 0) / 60;
			dailyWorked[key] = h;
			dailyOt[key] = (Number(a.overtime_minutes ?? 0) || 0) / 60;
			if (h > 0) presentDays++;
		}

		const buckets = buildWeeklyBuckets(
			range.start,
			range.end,
			dailyWorked,
			dailyOt,
			dailyType,
			emp.required_hours_per_week,
			emp.grace_hours,
			emp.deduction_enabled,
			emp.salary_type,
			emp.salary_rate
		);

		const totalWorked = Object.values(dailyWorked).reduce((s, v) => s + v, 0);
		const totalOt = Object.values(dailyOt).reduce((s, v) => s + v, 0);

		const calc = computePayoutForEmployee(emp, buckets, presentDays, totalWorked, totalOt);

		await auth.supabase.from("hr_employee_payouts").insert({
			batch_id: batchId,
			employee_id: emp.id,
			total_days: presentDays,
			total_hours: totalWorked,
			overtime_hours: totalOt,
			required_hours: buckets.reduce((s, b) => s + b.requiredHours, 0),
			short_hours: buckets.reduce((s, b) => s + b.shortHours, 0),
			deduction_amount: calc.deductionAmount,
			base_salary: calc.baseSalary,
			overtime_pay: calc.overtimePay,
			final_salary: calc.finalSalary,
			paid_amount: 0,
			remaining_amount: calc.finalSalary,
			payout_status: "pending",
			weekly_breakdown: calc.weekly_breakdown,
		});
	}

	return NextResponse.json({
		ok: true,
		batch_id: batchId,
		month_label: range.label,
		period_from: fromStr,
		period_to: toStr,
		employees_processed: employeesList.length,
	});
}
