"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	projectSchema,
	type ProjectFormValues,
} from "@/lib/validations/project";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

async function recalcLayoutExpenseForProject(supabase: any, projectId: string) {
	const { data: plots } = await supabase
		.from("plots")
		.select("size_sqft, rate_per_sqft")
		.eq("project_id", projectId);
	const total = (plots ?? []).reduce((sum: number, p: any) => {
		const size = Number(p.size_sqft ?? 0);
		const rate = Number(p.rate_per_sqft ?? 0);
		if (size <= 0 || rate <= 0) return sum;
		return sum + size * rate;
	}, 0);

	await supabase
		.from("projects")
		.update({ layout_expense: total, updated_at: new Date().toISOString() })
		.eq("id", projectId);
}

export async function createProject(
	values: ProjectFormValues
): Promise<ActionResponse> {
	const parsed = projectSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: projectRow, error } = await supabase
		.from("projects")
		.insert({
			name: parsed.data.name,
			location: parsed.data.location,
			total_plots_count: parsed.data.total_plots_count,
			layout_expense: 0,
			starting_plot_number: parsed.data.starting_plot_number ?? 1,
			description: parsed.data.description ?? "",
		})
		.select("*")
		.single();

	if (error) {
		return { success: false, error: error.message };
	}

	// Auto-create basic plot records for this project
	const count = parsed.data.total_plots_count;
	const start = parsed.data.starting_plot_number ?? 1;
	if (projectRow && count > 0) {
		const plotsToInsert = Array.from({ length: count }, (_, idx) => {
			const plotNumber = String(start + idx);
			return {
				project_id: projectRow.id,
				plot_number: plotNumber,
				size_sqft: 0,
				rate_per_sqft: 0,
				facing: null,
			};
		});

		const { error: plotError } = await supabase
			.from("plots")
			.insert(plotsToInsert);

		if (plotError) {
			return {
				success: false,
				error: `Project created but failed to create plots: ${plotError.message}`,
			};
		}
	}
	if (projectRow?.id) {
		await recalcLayoutExpenseForProject(supabase, projectRow.id);
	}

	revalidatePath("/projects");
	return { success: true };
}

export async function updateProject(
	id: string,
	values: ProjectFormValues
): Promise<ActionResponse> {
	const parsed = projectSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase
		.from("projects")
		.update({
			name: parsed.data.name,
			location: parsed.data.location,
			total_plots_count: parsed.data.total_plots_count,
			starting_plot_number: parsed.data.starting_plot_number ?? 1,
			description: parsed.data.description ?? "",
			updated_at: new Date().toISOString(),
		})
		.eq("id", id);

	if (error) {
		return { success: false, error: error.message };
	}
	await recalcLayoutExpenseForProject(supabase, id);

	revalidatePath("/projects");
	revalidatePath(`/projects/${id}`);
	return { success: true };
}

export async function getProjects() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: projects, error } = await supabase
		.from("projects")
		.select("*")
		.eq("is_active", true)
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(error.message);
	}

	return projects;
}

export async function getProjectById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data: project, error } = await supabase
		.from("projects")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		return null;
	}

	return project;
}

export type PlotStatusCounts = {
	available: number;
	token: number;
	agreement: number;
	sold: number;
	total: number;
};

export type ProjectWithStats = {
	project: NonNullable<Awaited<ReturnType<typeof getProjectById>>>;
	plotCounts: PlotStatusCounts;
	totalRevenue: number;
	recentSales: Array<{
		id: string;
		plot_number: string;
		customer_name: string;
		advisor_name: string;
		total_sale_amount: number;
		token_date: string | null;
		sale_phase: string;
	}>;
};

export async function getProjectWithStats(
	id: string
): Promise<ProjectWithStats | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	// Fetch project
	const { data: project, error: projectError } = await supabase
		.from("projects")
		.select("*")
		.eq("id", id)
		.single();

	if (projectError || !project) return null;

	// Fetch all plots for this project
	const { data: plots } = await supabase
		.from("plots")
		.select("id, status")
		.eq("project_id", id);

	const plotCounts: PlotStatusCounts = {
		available: 0,
		token: 0,
		agreement: 0,
		sold: 0,
		total: plots?.length ?? 0,
	};

	plots?.forEach((plot) => {
		if (plot.status && plot.status in plotCounts) {
			plotCounts[plot.status as keyof Omit<PlotStatusCounts, "total">]++;
		}
	});

	// Fetch sales for this project's plots
	const plotIds = plots?.map((p) => p.id) ?? [];

	let totalRevenue = 0;
	let recentSales: ProjectWithStats["recentSales"] = [];

	if (plotIds.length > 0) {
		const { data: sales } = await supabase
			.from("plot_sales")
			.select(
				`
        id,
        total_sale_amount,
        token_date,
        sale_phase,
        plot_id,
        plots!inner(plot_number),
        customers!inner(name),
        advisors!inner(name)
      `
			)
			.in("plot_id", plotIds)
			.eq("is_cancelled", false)
			.order("created_at", { ascending: false })
			.limit(5);

		if (sales) {
			totalRevenue = sales.reduce(
				(sum, s) => sum + Number(s.total_sale_amount ?? 0),
				0
			);

			recentSales = sales.map((s: any) => ({
				id: s.id,
				plot_number: s.plots?.plot_number ?? "—",
				customer_name: s.customers?.name ?? "—",
				advisor_name: s.advisors?.name ?? "—",
				total_sale_amount: Number(s.total_sale_amount),
				token_date: s.token_date,
				sale_phase: s.sale_phase,
			}));
		}
	}

	return { project, plotCounts, totalRevenue, recentSales };
}

export async function getProjectsWithPlotCounts() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: projects, error } = await supabase
		.from("projects")
		.select("*")
		.eq("is_active", true)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	if (!projects) return [];

	// For each project, get plot status counts
	const projectIds = projects.map((p) => p.id);

	const { data: allPlots } = await supabase
		.from("plots")
		.select("project_id, status")
		.in("project_id", projectIds);

	const plotCountsMap = new Map<string, PlotStatusCounts>();

	projects.forEach((p) => {
		plotCountsMap.set(p.id, {
			available: 0,
			token: 0,
			agreement: 0,
			sold: 0,
			total: 0,
		});
	});

	allPlots?.forEach((plot) => {
		const counts = plotCountsMap.get(plot.project_id);
		if (counts) {
			counts.total++;
			if (plot.status && plot.status in counts) {
				counts[plot.status as keyof Omit<PlotStatusCounts, "total">]++;
			}
		}
	});

	return projects.map((project) => ({
		...project,
		plotCounts: plotCountsMap.get(project.id) ?? {
			available: 0,
			token: 0,
			agreement: 0,
			sold: 0,
			total: 0,
		},
	}));
}
