import { z } from "zod";

export const projectSchema = z.object({
	name: z.string().min(2, "Project name must be at least 2 characters"),
	location: z.string().min(1, "Location is required"),
	total_plots_count: z
		.number()
		.int("Must be a whole number")
		.min(1, "Must be at least 1"),
	starting_plot_number: z.number().int().min(1, "Must be at least 1").default(1),
	builder_name: z.string().optional().default(""),
	segment: z.enum(["Luxury", "Mid", "Affordable"]).default("Mid"),
	description: z.string().default(""),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
