import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  alternate_phone: z
    .string()
    .optional()
    .default("")
    .refine((v) => v === "" || /^\d{10}$/.test(v), {
      message: "Alternate phone must be exactly 10 digits",
    }),
  address: z.string().optional().default(""),
  birth_date: z.string().optional().nullable(),
  advisor_id: z.preprocess(
    (v) => (v === "none" || v === "" ? null : v),
    z.string().uuid("Invalid advisor selected").optional().nullable()
  ),
  route: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  is_active: z.boolean().default(true),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
