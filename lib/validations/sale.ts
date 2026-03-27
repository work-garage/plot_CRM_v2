import { z } from "zod";

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === "" || value == null) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }, schema.optional().nullable());

const requiredNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === "" || value == null) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }, schema);

export const saleSchema = z
  .object({
    plot_id: z.string().uuid("Invalid plot selected"),
    customer_id: z.string().uuid("Invalid customer selected"),
    sold_by_admin: z.boolean().default(false),
    advisor_id: z.string().uuid("Invalid advisor selected").optional().nullable(),
    advisor_rate_per_sqft: optionalNumber(
      z.number().positive("Advisor rate per sqft must be positive"),
    ),
    sale_phase: z.enum(["token", "agreement", "registry", "full_payment"]),
    token_date: z.string().optional().nullable(),
    agreement_date: z.string().optional().nullable(),
    total_sale_amount: requiredNumber(
      z.number().positive("Total sale amount must be positive"),
    ),
    down_payment: requiredNumber(z.number().min(0)).default(0),
    emi_months: optionalNumber(z.number().min(1).max(120)),
    monthly_emi: optionalNumber(z.number().min(0)),
    emi_day: optionalNumber(z.number().min(1).max(31)),
    followup_date: z.string().optional().nullable(),
    notes: z.string().optional().default(""),
  })
  .refine((data) => !data.sold_by_admin || data.advisor_id == null, {
    message: "Admin sale must not have advisor",
    path: ["advisor_id"],
  })
  .refine((data) => data.sold_by_admin || (data.advisor_id && data.advisor_id.length > 0), {
    message: "Advisor is required when not sold by admin",
    path: ["advisor_id"],
  })
  .refine((data) => data.sold_by_admin || Number(data.advisor_rate_per_sqft ?? 0) > 0, {
    message: "Advisor rate per sqft is required when selling via advisor",
    path: ["advisor_rate_per_sqft"],
  })
  .refine((data) => Number(data.down_payment ?? 0) <= Number(data.total_sale_amount ?? 0), {
    message: "Down payment cannot exceed selling price",
    path: ["down_payment"],
  });

export type SaleFormValues = z.infer<typeof saleSchema>;
