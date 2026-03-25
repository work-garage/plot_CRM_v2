export type PaymentTemplateId = "payment_due" | "emi_due" | "overdue";

export type PaymentMessageTemplate = {
	id: PaymentTemplateId;
	label: string;
	body: string;
};

export const PAYMENT_MESSAGE_TEMPLATES: PaymentMessageTemplate[] = [
	{
		id: "payment_due",
		label: "Payment due (general)",
		body:
			"Hi [name], this is a gentle reminder regarding your pending payment of [remaining] for plot [plot] at [project]. Please pay at your earliest convenience.\n\n— S-Infra",
	},
	{
		id: "emi_due",
		label: "EMI due",
		body:
			"Hi [name], your EMI of [emi_amount] for plot [plot] ([project]) is due on [due_date]. Remaining balance: [remaining]. Thank you.\n\n— S-Infra",
	},
	{
		id: "overdue",
		label: "Overdue follow-up",
		body:
			"Hi [name], we noticed an overdue balance of [remaining] for plot [plot] ([project]). Please contact us to arrange payment.\n\n— S-Infra",
	},
];

const STORAGE_PREFIX = "sinfra_payment_template_";

export function getStoredPaymentTemplateId(): PaymentTemplateId {
	if (typeof window === "undefined") return "payment_due";
	try {
		const v = localStorage.getItem(`${STORAGE_PREFIX}default`) as PaymentTemplateId | null;
		if (v && PAYMENT_MESSAGE_TEMPLATES.some((t) => t.id === v)) return v;
	} catch {
		/* ignore */
	}
	return "payment_due";
}

export function setStoredPaymentTemplateId(id: PaymentTemplateId) {
	try {
		localStorage.setItem(`${STORAGE_PREFIX}default`, id);
	} catch {
		/* ignore */
	}
}

export function fillPaymentTemplate(
	body: string,
	vars: {
		name: string;
		plot: string;
		project: string;
		remaining: string;
		emi_amount: string;
		due_date: string;
	}
): string {
	return body
		.replace(/\[name\]/g, vars.name)
		.replace(/\[plot\]/g, vars.plot)
		.replace(/\[project\]/g, vars.project)
		.replace(/\[remaining\]/g, vars.remaining)
		.replace(/\[emi_amount\]/g, vars.emi_amount)
		.replace(/\[due_date\]/g, vars.due_date);
}
