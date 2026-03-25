"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { computePaymentDueMeta } from "@/lib/payment-due";
import {
	paymentSchema,
	type PaymentFormValues,
} from "@/lib/validations/payment";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export async function createPayment(
	values: PaymentFormValues
): Promise<ActionResponse> {
	const parsed = paymentSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	// Guard: confirmed customer payments should never exceed sale total.
	const { data: saleRow, error: saleErr } = await supabase
		.from("plot_sales")
		.select("id, total_sale_amount")
		.eq("id", parsed.data.sale_id)
		.single();
	if (saleErr || !saleRow) {
		return { success: false, error: "Sale not found" };
	}

	const { data: paidRows, error: paidErr } = await supabase
		.from("payments")
		.select("amount")
		.eq("sale_id", parsed.data.sale_id)
		.eq("is_confirmed", true);
	if (paidErr) return { success: false, error: paidErr.message };

	const alreadyConfirmed = (paidRows ?? []).reduce(
		(sum, p: any) => sum + Number(p.amount ?? 0),
		0
	);
	const nextConfirmed =
		alreadyConfirmed +
		(parsed.data.is_confirmed ? Number(parsed.data.amount ?? 0) : 0);
	const saleTotal = Number(saleRow.total_sale_amount ?? 0);
	if (nextConfirmed > saleTotal + 0.0001) {
		const remaining = Math.max(0, saleTotal - alreadyConfirmed);
		return {
			success: false,
			error: `Payment exceeds sale amount. Remaining allowed: ₹ ${remaining.toLocaleString(
				"en-IN"
			)}`,
		};
	}

	const { error } = await supabase.from("payments").insert({
		sale_id: parsed.data.sale_id,
		customer_id: parsed.data.customer_id,
		amount: parsed.data.amount,
		payment_date: parsed.data.payment_date,
		payment_mode: parsed.data.payment_mode,
		slip_number: parsed.data.slip_number || null,
		receipt_path: parsed.data.receipt_path || null,
		is_confirmed: parsed.data.is_confirmed,
		notes: parsed.data.notes || null,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/payments");
	revalidatePath("/sales");
	return { success: true };
}

export type PaymentsFilter = {
	from?: string;
	to?: string;
	status?: "confirmed" | "pending" | "";
	mode?: string;
};

async function lastConfirmedPaymentDateBySale(
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
	saleIds: string[]
): Promise<Record<string, string>> {
	if (!saleIds.length) return {};
	const { data, error } = await supabase
		.from("payments")
		.select("sale_id, payment_date")
		.in("sale_id", saleIds)
		.eq("is_confirmed", true)
		.order("payment_date", { ascending: false });
	if (error) throw new Error(error.message);
	const map: Record<string, string> = {};
	for (const row of data ?? []) {
		const sid = (row as { sale_id: string }).sale_id;
		if (!map[sid]) {
			map[sid] = String((row as { payment_date: string }).payment_date).slice(0, 10);
		}
	}
	return map;
}

function enrichPaymentsWithDue(
	rows: any[],
	lastBySale: Record<string, string>
) {
	return rows.map((p) => {
		const sale = p.plot_sales as Record<string, unknown> | null | undefined;
		const saleId = sale?.id as string | undefined;
		const last = saleId ? lastBySale[saleId] : undefined;
		const meta = computePaymentDueMeta(
			{
				remaining_amount: sale?.remaining_amount,
				monthly_emi: sale?.monthly_emi,
				emi_day: sale?.emi_day,
				token_date: (sale?.token_date as string) ?? null,
				agreement_date: (sale?.agreement_date as string) ?? null,
				followup_date: (sale?.followup_date as string) ?? null,
			},
			last
		);
		return { ...p, payment_due_meta: meta };
	});
}

export async function getPayments(filters?: PaymentsFilter) {
	const supabase = await createClient();
	if (!supabase) return [];

	let q = supabase
		.from("payments")
		.select(
			`
      *,
      customers(name, phone),
      plot_sales(
        id,
        receipt_path,
        remaining_amount,
        monthly_emi,
        emi_day,
        token_date,
        agreement_date,
        followup_date,
        plots(plot_number, projects(name))
      )
    `
		)
		.order("payment_date", { ascending: false });

	const from = filters?.from?.trim();
	const to = filters?.to?.trim();
	if (from) q = q.gte("payment_date", from);
	if (to) q = q.lte("payment_date", to);
	const status = filters?.status;
	if (status === "confirmed") q = q.eq("is_confirmed", true);
	if (status === "pending") q = q.eq("is_confirmed", false);
	const mode = filters?.mode?.trim();
	if (mode) q = q.ilike("payment_mode", mode);

	const { data, error } = await q;

	if (error) throw new Error(error.message);
	const rows = data || [];
	const saleIds = [
		...new Set(
			rows
				.map((p: any) => p.plot_sales?.id)
				.filter(Boolean) as string[]
		),
	];
	const lastBySale = await lastConfirmedPaymentDateBySale(supabase, saleIds);
	return enrichPaymentsWithDue(rows, lastBySale);
}

export async function confirmPayment(id: string) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: payment, error: payErr } = await supabase
		.from("payments")
		.select("id, sale_id, amount, is_confirmed")
		.eq("id", id)
		.single();
	if (payErr || !payment) return { success: false, error: "Payment not found" };
	if (payment.is_confirmed) return { success: true };

	const { data: saleRow, error: saleErr } = await supabase
		.from("plot_sales")
		.select("id, total_sale_amount")
		.eq("id", payment.sale_id)
		.single();
	if (saleErr || !saleRow) return { success: false, error: "Sale not found" };

	const { data: paidRows, error: paidErr } = await supabase
		.from("payments")
		.select("amount")
		.eq("sale_id", payment.sale_id)
		.eq("is_confirmed", true);
	if (paidErr) return { success: false, error: paidErr.message };

	const alreadyConfirmed = (paidRows ?? []).reduce(
		(sum, p: any) => sum + Number(p.amount ?? 0),
		0
	);
	const nextConfirmed = alreadyConfirmed + Number(payment.amount ?? 0);
	const saleTotal = Number(saleRow.total_sale_amount ?? 0);
	if (nextConfirmed > saleTotal + 0.0001) {
		const remaining = Math.max(0, saleTotal - alreadyConfirmed);
		return {
			success: false,
			error: `Cannot confirm. Remaining allowed: ₹ ${remaining.toLocaleString(
				"en-IN"
			)}`,
		};
	}

	const { error } = await supabase
		.from("payments")
		.update({ is_confirmed: true })
		.eq("id", id);

	if (error) return { success: false, error: error.message };

	revalidatePath("/payments");
	revalidatePath("/sales");
	return { success: true };
}
