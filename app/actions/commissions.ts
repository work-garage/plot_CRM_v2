"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCommissions() {
	const supabase = await createClient();
	if (!supabase) return [];

	const baseSelect = `
      *,
      advisors(name, code),
      plot_sales(
        total_sale_amount,
        amount_paid,
        plots(plot_number, size_sqft, rate_per_sqft, projects(name))
      ),
      advisor_commission_payments(
        id,
        amount,
        paid_date,
        payment_mode,
        reference_number,
        receipt_path,
        note,
        created_at
      )
    `;
	const extraSelect = `
      *,
      advisors(name, code),
      plot_sales(
        total_sale_amount,
        amount_paid,
        plots(plot_number, size_sqft, rate_per_sqft, projects(name))
      ),
      advisor_commission_payments(
        id,
        amount,
        extra_paid_amount,
        paid_date,
        payment_mode,
        reference_number,
        receipt_path,
        note,
        created_at
      )
    `;

	const { data: dataWithExtra, error: errWithExtra } = await supabase
		.from("advisor_commissions")
		.select(extraSelect)
		.order("created_at", { ascending: false });
	if (!errWithExtra) return dataWithExtra || [];

	const msg = (errWithExtra.message || "").toLowerCase();
	if (!msg.includes("extra_paid_amount")) throw new Error(errWithExtra.message);

	const { data, error } = await supabase
		.from("advisor_commissions")
		.select(baseSelect)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data || []).map((row: any) => ({
		...row,
		advisor_commission_payments: (row.advisor_commission_payments ?? []).map(
			(p: any) => ({ ...p, extra_paid_amount: 0 })
		),
	}));
}

export async function getAdvisorCommissions(advisorId: string) {
	const supabase = await createClient();
	if (!supabase) return [];

	const baseSelect = `
      *,
      plot_sales(
        total_sale_amount,
        amount_paid,
        plots(plot_number, size_sqft, projects(name))
      ),
      advisor_commission_payments(
        id,
        amount,
        paid_date,
        payment_mode,
        reference_number,
        note,
        created_at
      )
    `;
	const extraSelect = `
      *,
      plot_sales(
        total_sale_amount,
        amount_paid,
        plots(plot_number, size_sqft, projects(name))
      ),
      advisor_commission_payments(
        id,
        amount,
        extra_paid_amount,
        paid_date,
        payment_mode,
        reference_number,
        note,
        created_at
      )
    `;

	const { data: dataWithExtra, error: errWithExtra } = await supabase
		.from("advisor_commissions")
		.select(extraSelect)
		.eq("advisor_id", advisorId)
		.order("created_at", { ascending: false });
	if (!errWithExtra) return dataWithExtra || [];

	const msg = (errWithExtra.message || "").toLowerCase();
	if (!msg.includes("extra_paid_amount")) throw new Error(errWithExtra.message);

	const { data, error } = await supabase
		.from("advisor_commissions")
		.select(baseSelect)
		.eq("advisor_id", advisorId)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data || []).map((row: any) => ({
		...row,
		advisor_commission_payments: (row.advisor_commission_payments ?? []).map(
			(p: any) => ({ ...p, extra_paid_amount: 0 })
		),
	}));
}

export async function recordCommissionPayment(
	id: string,
	amount: number,
	meta?: {
		paid_date?: string;
		note?: string;
		payment_mode?: "cash" | "online" | "cheque";
		reference_number?: string;
		receipt_path?: string;
		allow_extra?: boolean;
	},
) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: comm, error: getError } = await supabase
		.from("advisor_commissions")
		.select(
			`
      amount_paid,
      total_commission_amount,
      plot_sales(
        total_sale_amount,
        amount_paid,
        sale_phase
      )
    `,
		)
		.eq("id", id)
		.single();

	if (getError) return { success: false, error: getError.message };

	const alreadyPaidToAdvisor = Number(comm.amount_paid ?? 0);
	const saleTotal = Number((comm as any).plot_sales?.total_sale_amount ?? 0);
	const saleReceived = Number((comm as any).plot_sales?.amount_paid ?? 0); // confirmed receipts only
	const profitTotal = Number((comm as any).total_commission_amount ?? 0);
	const add = Number(amount ?? 0);
	if (!Number.isFinite(add) || add <= 0) {
		return { success: false, error: "Amount must be positive" };
	}
	if (saleTotal <= 0) {
		return { success: false, error: "Invalid sale total amount" };
	}

	// Advisor can only be paid proportional to confirmed money received.
	// eligible = profitTotal * min(1, saleReceived / saleTotal)
	const ratio = Math.min(1, Math.max(0, saleReceived / saleTotal));
	const eligible = Math.max(0, profitTotal) * ratio;
	const availableToPay = Math.max(0, eligible - alreadyPaidToAdvisor);
	const extraPaidAmount = Math.max(0, add - availableToPay);
	if (extraPaidAmount > 0.0001 && !meta?.allow_extra) {
		return {
			success: false,
			requiresExtraConfirmation: true,
			extraPaidAmount,
			error: `This payment includes extra payout of ₹ ${extraPaidAmount.toLocaleString(
				"en-IN"
			)} above currently eligible commission.`,
		};
	}
	if (extraPaidAmount > 0.0001 && meta?.allow_extra) {
		const extraReason = (meta?.note ?? "").trim();
		if (!extraReason) {
			return {
				success: false,
				error: "Reason is required for extra payment.",
			};
		}
	}

	// New flow: store payment row (history). Totals are kept in sync by DB trigger.
	const note = meta?.note?.trim() || null;
	const paidDate = meta?.paid_date?.trim() || new Date().toISOString().slice(0, 10);
	const paymentMode = meta?.payment_mode || "cash";
	const referenceNumber = meta?.reference_number?.trim() || null;
	const receiptPath = meta?.receipt_path?.trim() || null;

	const payload = {
		commission_id: id,
		amount: add,
		extra_paid_amount: extraPaidAmount,
		paid_date: paidDate,
		payment_mode: paymentMode,
		reference_number: referenceNumber,
		receipt_path: receiptPath,
		note,
	};
	const { error: payErr } = await supabase
		.from("advisor_commission_payments")
		.insert(payload);
	if (payErr) {
		const msg = (payErr.message || "").toLowerCase();
		if (msg.includes("extra_paid_amount")) {
			const { extra_paid_amount, ...fallbackPayload } = payload as any;
			const { error: fallbackErr } = await supabase
				.from("advisor_commission_payments")
				.insert(fallbackPayload);
			if (fallbackErr) return { success: false, error: fallbackErr.message };
			revalidatePath("/commissions");
			return { success: true, extraPaidAmount: 0 };
		}
		return { success: false, error: payErr.message };
	}

	revalidatePath("/commissions");
	return { success: true, extraPaidAmount };
}
