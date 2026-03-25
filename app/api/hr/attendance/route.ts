import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/hr/auth-route";

export async function GET(req: Request) {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const { searchParams } = new URL(req.url);
	const employeeId = searchParams.get("employee_id");
	const from = searchParams.get("from");
	const to = searchParams.get("to");

	let q = auth.supabase.from("hr_attendance").select("*, hr_employees(name, employee_code)");

	if (employeeId) q = q.eq("employee_id", employeeId);
	if (from) q = q.gte("work_date", from);
	if (to) q = q.lte("work_date", to);

	const { data, error } = await q.order("work_date", { ascending: false }).limit(2000);

	if (error) {
		if (error.message.includes("does not exist") || error.code === "42P01") {
			return NextResponse.json(
				{ error: "HR tables not installed. Run the latest Supabase migration." },
				{ status: 503 }
			);
		}
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json({ attendance: data ?? [] });
}
