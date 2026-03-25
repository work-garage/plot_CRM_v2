import type { HrSalaryType } from "./types";

/** One-line explanation of how `base_salary` was derived for this employee. */
export function describeSalaryBasis(params: {
	salary_type: string;
	salary_rate: number;
	presentDays: number;
	totalWorkedHours: number;
	/** Sum of required hours in the payout month (weekly buckets) — for monthly pro-rata copy */
	requiredHoursMonth?: number;
}): string {
	const t = params.salary_type as HrSalaryType;
	const r = params.salary_rate;
	if (t === "monthly") {
		const req = params.requiredHoursMonth;
		if (req != null && req > 0) {
			const frac = Math.min(1, params.totalWorkedHours / req);
			return `Base: pro-rata monthly ₹${r.toLocaleString("en-IN")} × (${params.totalWorkedHours.toFixed(2)}h ÷ ${req.toFixed(1)}h) = ${(frac * 100).toFixed(1)}% of full month`;
		}
		return `Base: pro-rata monthly ₹${r.toLocaleString("en-IN")} vs required hours in month`;
	}
	if (t === "daily") {
		return `Base: ${params.presentDays} present day(s) × ₹${r.toLocaleString("en-IN")}/day`;
	}
	return `Base: ${params.totalWorkedHours.toFixed(2)} h × ₹${r.toLocaleString("en-IN")}/h`;
}

export function describeRegularRateBasis(salaryType: string, requiredHoursPerWeek: number): string {
	const t = salaryType as HrSalaryType;
	if (t === "monthly") {
		return `For shortfall: monthly ÷ (${requiredHoursPerWeek} h/wk × 4.33)`;
	}
	if (t === "daily") {
		return `For shortfall: day rate ÷ 8 h`;
	}
	return `Same as pay rate (hourly)`;
}
