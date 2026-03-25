import { z } from "zod";

export const paymentSchema = z.object({
  sale_id: z.string().uuid("Invalid sale selected"),
  customer_id: z.string().uuid("Invalid customer selected"),
  amount: z.coerce.number().positive("Amount must be positive"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_mode: z.enum(["cash", "cheque", "online", "other"]),
  slip_number: z.string().optional().default(""),
  receipt_path: z.string().optional().default(""),
  is_confirmed: z.boolean().default(false),
  notes: z.string().optional().default(""),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
