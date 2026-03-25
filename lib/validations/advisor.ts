import { z } from "zod";

export const advisorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code is required"),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().default(""),
  birth_date: z.string().optional().nullable(),
  password: z.string().optional().default(""),
  use_phone_as_password: z.boolean().default(true),
  notes: z.string().optional().default(""),
  is_active: z.boolean().default(true),
});

export type AdvisorFormValues = z.infer<typeof advisorSchema>;
