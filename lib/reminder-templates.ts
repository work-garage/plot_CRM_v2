export type ReminderType =
	| "token_expiry"
	| "agreement_expiry"
	| "installment_due"
	| "birthday_customer"
	| "birthday_advisor"
	| "bank_statement"
	| "balance_plot"
	| "crm_followup"
	| "calling"
	| "other";

export interface MessageTemplate {
	id: string;
	name: string;
	body: string;
	description?: string;
}

export interface ReminderTemplateGroup {
	type: ReminderType;
	label: string;
	templates: MessageTemplate[];
}

const COMPANY_SIGNATURE = "\n\nRegards,\n[company]\nContact: [company_phone]";

export const REMINDER_TEMPLATES: ReminderTemplateGroup[] = [
	{
		type: "birthday_customer",
		label: "Customer Birthday",
		templates: [
			{
				id: "bd-1",
				name: "Warm & Joyful",
				body: `Wishing you a very Happy Birthday, [name]! 🎂 May this year bring you joy, prosperity, and success. Have a wonderful day!${COMPANY_SIGNATURE}`,
			},
			{
				id: "bd-2",
				name: "Formal",
				body: `Dear [name], We extend our warm wishes on your birthday. May the coming year be filled with happiness and good health.${COMPANY_SIGNATURE}`,
			},
			{
				id: "bd-3",
				name: "Short & Sweet",
				body: `Happy Birthday, [name]! 🎉 Wishing you a fantastic year ahead!${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "birthday_advisor",
		label: "Advisor Birthday",
		templates: [
			{
				id: "bda-1",
				name: "Partner Appreciation",
				body: `Happy Birthday, [name]! 🎂 Thank you for being a valued partner. Wishing you a year of growth and success!${COMPANY_SIGNATURE}`,
			},
			{
				id: "bda-2",
				name: "Professional",
				body: `Dear [name], wishing you a very Happy Birthday. May this year bring you continued success in all your endeavors.${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "token_expiry",
		label: "Token Expiry",
		templates: [
			{
				id: "te-1",
				name: "Urgent",
				body: `Hello [name], your token period for the plot at S-Infra is expiring soon. Kindly complete the process to avoid cancellation. Please contact us at your earliest.${COMPANY_SIGNATURE}`,
			},
			{
				id: "te-2",
				name: "Gentle Reminder",
				body: `Hi [name], this is a friendly reminder that your token period is approaching its end. We'd love to help you complete the next steps.${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "agreement_expiry",
		label: "Agreement Expiry",
		templates: [
			{
				id: "ae-1",
				name: "Action Required",
				body: `Hello [name], your agreement period is approaching its deadline. Please visit our office for the next steps at your earliest convenience.${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "installment_due",
		label: "Installment Due",
		templates: [
			{
				id: "id-1",
				name: "Standard",
				body: `Hello [name], this is a reminder for your plot installment due at S-Infra. Kindly ignore if already paid.${COMPANY_SIGNATURE}`,
			},
			{
				id: "id-2",
				name: "Friendly",
				body: `Hi [name], just a quick reminder about your upcoming installment. Please disregard if you've already made the payment.${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "crm_followup",
		label: "CRM Follow-up",
		templates: [
			{
				id: "crm-1",
				name: "General",
				body: `Hello [name], following up on our previous discussion regarding the S-Infra projects in Nagpur. Would love to connect soon!${COMPANY_SIGNATURE}`,
			},
			{
				id: "crm-2",
				name: "Task Specific",
				body: `Hi [name], regarding your task: [title]. [description]${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "bank_statement",
		label: "Bank Statement",
		templates: [
			{
				id: "bs-1",
				name: "Request",
				body: `Hello [name], kindly share the bank statement for [title] at your earliest convenience.${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "balance_plot",
		label: "Balance Plot",
		templates: [
			{
				id: "bp-1",
				name: "Outstanding",
				body: `Hello [name], this is regarding the outstanding balance for your plot. Please reach out to us to clear the dues.${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "calling",
		label: "Calling",
		templates: [
			{
				id: "cl-1",
				name: "Call Back",
				body: `Hello [name], we tried reaching you. Please call us back regarding [title] when convenient.${COMPANY_SIGNATURE}`,
			},
		],
	},
	{
		type: "other",
		label: "Other",
		templates: [
			{
				id: "ot-1",
				name: "General",
				body: `Hello [name], regarding: [title]. [description]${COMPANY_SIGNATURE}`,
			},
		],
	},
];

const TEMPLATE_STORAGE_KEY = "sinfra_reminder_templates";

export function getStoredTemplateId(type: ReminderType): string | null {
	if (typeof window === "undefined") return null;
	try {
		const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
		if (!stored) return null;
		const obj = JSON.parse(stored);
		return obj[type] ?? null;
	} catch {
		return null;
	}
}

export function setStoredTemplateId(type: ReminderType, templateId: string): void {
	if (typeof window === "undefined") return;
	try {
		const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
		const obj = stored ? JSON.parse(stored) : {};
		obj[type] = templateId;
		localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(obj));
	} catch {
		// ignore
	}
}

export function getTemplateForType(type: ReminderType, templateId?: string | null): MessageTemplate | null {
	const group = REMINDER_TEMPLATES.find((g) => g.type === type);
	if (!group || !group.templates.length) return null;
	const id = templateId ?? getStoredTemplateId(type);
	const template = id ? group.templates.find((t) => t.id === id) : null;
	return template ?? group.templates[0];
}

export function getDynamicFields(): string[] {
	return ["name", "date", "title", "description", "company", "company_phone"];
}

const DEFAULT_VALUES: Record<string, string> = {
	company: "S-Infra",
	company_phone: "+91 9876543210",
};

export function fillTemplate(
	templateBody: string,
	values: Partial<Record<string, string>>
): string {
	const normalized: Record<string, string> = {};
	for (const [k, v] of Object.entries(values)) {
		if (v != null && v !== "") normalized[k.toLowerCase()] = v;
	}
	return templateBody.replace(/\[([^\]]+)\]/g, (_, key) => {
		const k = key.trim().toLowerCase();
		return normalized[k] ?? DEFAULT_VALUES[k] ?? `[${key}]`;
	});
}
