import { z } from "zod";

export const reminderSchema = z.object({
	title: z.string().min(2, "Title is required"),
	type: z
		.enum([
			"token_expiry",
			"agreement_expiry",
			"installment_due",
			"birthday_customer",
			"birthday_advisor",
			"bank_statement",
			"balance_plot",
			"crm_followup",
			"calling",
			"other",
		])
		.default("crm_followup"),
	description: z.string().optional().default(""),
	phone: z.string().optional().nullable(),
	reminder_date: z.string().min(1, "Date is required"),
	reminder_time: z.string().optional().nullable(),
	customer_id: z
		.string()
		.uuid("Invalid customer selected")
		.optional()
		.nullable(),
	project_id: z
		.string()
		.uuid("Invalid project selected")
		.optional()
		.nullable(),
	is_completed: z.boolean().default(false),
});

export type ReminderFormValues = z.infer<typeof reminderSchema>;
