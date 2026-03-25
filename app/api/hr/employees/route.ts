import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/hr/auth-route";

export async function GET() {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const { data, error } = await auth.supabase
		.from("hr_employees")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		if (error.message.includes("does not exist") || error.code === "42P01") {
			return NextResponse.json(
				{ error: "HR tables not installed. Run the latest Supabase migration." },
				{ status: 503 }
			);
		}
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json({ employees: data ?? [] });
}

export async function POST(req: Request) {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const body = await req.json().catch(() => null);
	if (!body?.name || !body?.employee_code) {
		return NextResponse.json({ error: "name and employee_code required" }, { status: 400 });
	}

	const { data, error } = await auth.supabase
		.from("hr_employees")
		.insert({
			name: String(body.name),
			employee_code: String(body.employee_code).trim(),
			phone: body.phone ?? null,
			salary_type: body.salary_type ?? "monthly",
			salary_rate: Number(body.salary_rate ?? 0),
			overtime_rate: Number(body.overtime_rate ?? 0),
			required_hours_per_week: Number(body.required_hours_per_week ?? 48),
			grace_hours: Number(body.grace_hours ?? 0),
			deduction_enabled: body.deduction_enabled !== false,
		})
		.select("id")
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ id: data?.id });
}
