import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/hr/auth-route";

export async function GET() {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const { data, error } = await auth.supabase
		.from("hr_payout_batches")
		.select(
			"*, hr_employee_payouts(*, hr_employees(name, employee_code, salary_type, salary_rate, overtime_rate, required_hours_per_week, grace_hours, deduction_enabled))"
		)
		.order("created_at", { ascending: false })
		.limit(50);

	if (error) {
		if (error.message.includes("does not exist") || error.code === "42P01") {
			return NextResponse.json(
				{ error: "HR tables not installed. Run the latest Supabase migration." },
				{ status: 503 }
			);
		}
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json({ batches: data ?? [] });
}
