import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/hr/auth-route";

export async function POST(req: Request) {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const body = await req.json().catch(() => null);
	const id = body?.id as string | undefined;
	const paid = Number(body?.paid_amount ?? 0);
	if (!id || !Number.isFinite(paid) || paid < 0) {
		return NextResponse.json({ error: "id and paid_amount required" }, { status: 400 });
	}

	const { data: row, error: e1 } = await auth.supabase
		.from("hr_employee_payouts")
		.select("*")
		.eq("id", id)
		.single();
	if (e1 || !row) return NextResponse.json({ error: "Payout row not found" }, { status: 404 });

	const finalSal = Number(row.final_salary ?? 0);
	const newPaid = Math.min(finalSal, Number(row.paid_amount ?? 0) + paid);
	const remaining = Math.max(0, finalSal - newPaid);
	let status = "pending";
	if (newPaid <= 0) status = "pending";
	else if (remaining > 0) status = "partial";
	else status = "paid";

	const { error: e2 } = await auth.supabase
		.from("hr_employee_payouts")
		.update({
			paid_amount: newPaid,
			remaining_amount: remaining,
			payout_status: status,
		})
		.eq("id", id);

	if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });
	return NextResponse.json({ ok: true, paid_amount: newPaid, remaining_amount: remaining, payout_status: status });
}
