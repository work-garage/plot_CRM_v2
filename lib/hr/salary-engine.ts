import type { HrEmployeeRow, HrSalaryType } from "./types";

/** Calendar YYYY-MM-DD in local timezone (matches Postgres `date` / attendance `work_date`). */
export function formatYmdLocal(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export type WeekBucket = {
	weekKey: string;
	start: string;
	end: string;
	workedHours: number;
	overtimeHours: number;
	requiredHours: number;
	shortHours: number;
	deduction: number;
};

function mondayOfWeek(d: Date): Date {
	const day = d.getDay();
	const diff = (day === 0 ? -6 : 1) - day;
	const x = new Date(d);
	x.setDate(d.getDate() + diff);
	x.setHours(0, 0, 0, 0);
	return x;
}

function addDays(d: Date, n: number): Date {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}

/**
 * Rate used for short-hour deductions (same basis as weekly bucket `deduction`).
 * Monthly: salary ÷ (required hrs/week × 4.33). Daily: day rate ÷ 8. Hourly: hourly rate.
 */
export function computeRegularHourlyEquivalent(
	salaryType: HrSalaryType,
	salaryRate: number,
	requiredHoursPerWeek: number
): number {
	if (salaryType === "monthly") {
		const approxMonthHours = requiredHoursPerWeek * 4.33;
		return approxMonthHours > 0 ? salaryRate / approxMonthHours : 0;
	}
	if (salaryType === "daily") {
		return salaryRate / 8;
	}
	return salaryRate;
}

function countDaysInPeriod(weekStart: Date, rangeStart: Date, rangeEnd: Date): number {
	let n = 0;
	for (let i = 0; i < 7; i++) {
		const day = addDays(weekStart, i);
		if (day >= rangeStart && day <= rangeEnd) n++;
	}
	return n;
}

/**
 * Prorate required weekly hours for partial weeks at month boundaries.
 */
export function buildWeeklyBuckets(
	periodStart: Date,
	periodEnd: Date,
	dailyWorkedHours: Record<string, number>,
	dailyOvertimeHours: Record<string, number>,
	dailyType: Record<string, "present" | "leave" | "holiday">,
	requiredHoursPerWeek: number,
	graceHours: number,
	deductionEnabled: boolean,
	salaryType: HrSalaryType,
	salaryRate: number
): WeekBucket[] {
	const buckets: WeekBucket[] = [];
	let cursor = mondayOfWeek(periodStart);
	const end = new Date(periodEnd);
	end.setHours(23, 59, 59, 999);

	while (cursor <= end) {
		const weekStart = new Date(cursor);
		const weekEnd = addDays(weekStart, 6);
		const weekKey = formatYmdLocal(weekStart);

		let worked = 0;
		let ot = 0;
		for (let i = 0; i < 7; i++) {
			const day = addDays(weekStart, i);
			if (day < periodStart || day > periodEnd) continue;
			const key = formatYmdLocal(day);
			const t = dailyType[key] ?? "present";
			if (t === "holiday" || t === "leave") continue;
			worked += dailyWorkedHours[key] ?? 0;
			ot += dailyOvertimeHours[key] ?? 0;
		}

		const overlapDays = countDaysInPeriod(weekStart, periodStart, end);
		const factor = overlapDays / 7;
		const required = requiredHoursPerWeek * factor;
		let short = Math.max(0, required - worked);
		if (short <= graceHours) short = 0;

		const hourlyEquivalent = computeRegularHourlyEquivalent(salaryType, salaryRate, requiredHoursPerWeek);

		const deduction = deductionEnabled ? short * hourlyEquivalent : 0;

		buckets.push({
			weekKey,
			start: formatYmdLocal(weekStart),
			end: formatYmdLocal(weekEnd),
			workedHours: worked,
			overtimeHours: ot,
			requiredHours: required,
			shortHours: short,
			deduction,
		});

		cursor = addDays(weekStart, 7);
	}

	return buckets;
}

function sumRequiredHours(buckets: WeekBucket[]): number {
	return buckets.reduce((s, b) => s + b.requiredHours, 0);
}

/**
 * Floor pay from hours worked at the package implied rate (net cannot fall below this + OT).
 * Monthly: monthly salary × min(1, W ÷ R). Daily: (day rate ÷ 8) × W. Hourly: W × hourly rate.
 */
export function computeEarnedMinimumFromWorkedHours(
	emp: HrEmployeeRow,
	totalWorkedHours: number,
	totalRequiredHoursInPeriod: number
): number {
	const W = Math.max(0, totalWorkedHours);
	const R = totalRequiredHoursInPeriod;
	if (emp.salary_type === "monthly") {
		if (R <= 0) return 0;
		return Number(emp.salary_rate) * Math.min(1, W / R);
	}
	if (emp.salary_type === "daily") {
		return W * (Number(emp.salary_rate) / 8);
	}
	return W * Number(emp.salary_rate);
}

export function computePayoutForEmployee(
	emp: HrEmployeeRow,
	buckets: WeekBucket[],
	presentDays: number,
	totalWorkedHours: number,
	totalOvertimeHours: number
): {
	baseSalary: number;
	overtimePay: number;
	deductionAmount: number;
	finalSalary: number;
	weekly_breakdown: WeekBucket[];
} {
	const weekly_breakdown = buckets;
	const R = sumRequiredHours(buckets);
	const otPay = totalOvertimeHours * Number(emp.overtime_rate ?? 0);

	/**
	 * Weekly shortfall vs full-time norm:
	 * - Monthly: applied via pro-rata base (see below), not as a separate clawback that can exceed salary.
	 * - Hourly: already paid per hour worked; do not apply norm shortfall deductions.
	 * - Daily: optional shortfall deduction, capped by net floor.
	 */
	const rawShortfallDeduction =
		emp.salary_type === "daily" && emp.deduction_enabled
			? deductionEnabledSum(weekly_breakdown, true)
			: 0;

	const earnedMinimum = computeEarnedMinimumFromWorkedHours(emp, totalWorkedHours, R);

	let base = 0;
	if (emp.salary_type === "monthly") {
		/** Pro-rata against required hours in the month (same as earned-minimum formula). */
		base = earnedMinimum;
	} else if (emp.salary_type === "daily") {
		base = presentDays * Number(emp.salary_rate);
	} else {
		base = totalWorkedHours * Number(emp.salary_rate);
	}

	let finalSalary = base + otPay - rawShortfallDeduction;
	finalSalary = Math.max(earnedMinimum + otPay, finalSalary);
	finalSalary = Math.max(0, finalSalary);

	/** Amount actually withheld after floors (matches base + OT − net). */
	const deductionAmount = Math.max(0, base + otPay - finalSalary);

	return {
		baseSalary: base,
		overtimePay: otPay,
		deductionAmount,
		finalSalary,
		weekly_breakdown,
	};
}

function deductionEnabledSum(buckets: WeekBucket[], enabled: boolean): number {
	if (!enabled) return 0;
	return buckets.reduce((s, b) => s + b.deduction, 0);
}
