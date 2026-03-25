import { z } from "zod";

export const expenseSchema = z.object({
  description: z.string().min(2, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paid_amount: z.coerce.number().nonnegative("Paid amount cannot be negative"),
  expense_date: z.string().min(1, "Date is required"),
  payment_type: z.enum(["cash", "online", "cheque", "upi", "bank_transfer", "other"]),
  category: z.enum([
    "office",
    "marketing",
    "travel",
    "layout_dev",
    "legal",
    "salary",
    "utilities",
    "maintenance",
    "misc",
  ]),
  project_id: z.string().uuid("Invalid project selected").optional().nullable(),
  receipt_note: z.string().optional().default(""),
  receipt_path: z.string().optional().default(""),
}).refine((v) => v.paid_amount <= v.amount, {
  path: ["paid_amount"],
  message: "Paid amount cannot exceed total amount",
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
