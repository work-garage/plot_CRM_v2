import { getNextEmiDueDate } from "@/lib/utils/emi";

export type SaleLikeForDue = {
	remaining_amount?: unknown;
	monthly_emi?: unknown;
	emi_day?: unknown;
	token_date?: string | null;
	agreement_date?: string | null;
	followup_date?: string | null;
};

/**
 * Computes whether a payment follow-up WhatsApp should be offered.
 * Due when there is an outstanding balance and:
 * - next EMI date is today, or
 * - manual follow-up date is today, or
 * - next EMI or follow-up date is in the past (overdue).
 */
export function computePaymentDueMeta(
	sale: SaleLikeForDue,
	lastConfirmedPaymentDate: string | null | undefined
): {
	next_emi_due: string | null;
	is_payment_due: boolean;
	followup_date: string | null;
} {
	const remaining = Number(sale.remaining_amount ?? 0);
	const followup =
		typeof sale.followup_date === "string" && sale.followup_date.trim()
			? sale.followup_date.trim().slice(0, 10)
			: null;

	if (remaining <= 0) {
		return { next_emi_due: null, is_payment_due: false, followup_date: followup };
	}

	const hasEmi =
		sale.monthly_emi != null && Number(sale.monthly_emi) > 0 && sale.emi_day;

	let next_emi_due: string | null = null;
	if (hasEmi) {
		next_emi_due = getNextEmiDueDate(
			{
				emi_day: Number(sale.emi_day),
				token_date: sale.token_date ?? null,
				agreement_date: sale.agreement_date ?? null,
			},
			lastConfirmedPaymentDate ?? null
		);
	}

	const today = new Date().toISOString().slice(0, 10);

	let is_payment_due = false;

	if (next_emi_due) {
		if (next_emi_due <= today) is_payment_due = true;
	}
	if (followup) {
		if (followup <= today) is_payment_due = true;
	}

	// Non-EMI sales: follow-up date drives due state
	if (!hasEmi && followup && followup <= today) {
		is_payment_due = true;
	}

	return { next_emi_due, is_payment_due, followup_date: followup };
}

export function formatWhatsAppPhone(raw: string | null | undefined): string | null {
	if (!raw) return null;
	const digits = raw.replace(/\D/g, "");
	if (!digits) return null;
	return digits.startsWith("91") ? digits : `91${digits}`;
}
