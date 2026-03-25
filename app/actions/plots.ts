"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { plotSchema, type PlotFormValues } from "@/lib/validations/plot";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export async function createPlot(
	projectId: string,
	values: PlotFormValues
): Promise<ActionResponse> {
	const parsed = plotSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase.from("plots").insert({
		project_id: projectId,
		plot_number: parsed.data.plot_number,
		size_sqft: parsed.data.size_sqft,
		rate_per_sqft: parsed.data.rate_per_sqft,
		facing: parsed.data.facing || null,
		notes: parsed.data.notes || null,
	});

	if (error) {
		if (error.code === "23505") {
			return {
				success: false,
				error: "Plot number already exists in this project",
			};
		}
		return { success: false, error: error.message };
	}

	revalidatePath(`/projects/${projectId}/plots`);
	revalidatePath(`/projects/${projectId}`);
	return { success: true };
}

export async function createBulkPlots(
	projectId: string,
	data: {
		from_number: number;
		to_number: number;
		prefix: string;
		size_sqft: number;
		rate_per_sqft: number;
		facing: string;
	}
): Promise<ActionResponse & { count?: number }> {
	if (data.to_number < data.from_number) {
		return { success: false, error: "To number must be >= From number" };
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const plots = [];
	for (let i = data.from_number; i <= data.to_number; i++) {
		const plotNumber = `${data.prefix}${String(i).padStart(2, "0")}`;
		plots.push({
			project_id: projectId,
			plot_number: plotNumber,
			size_sqft: data.size_sqft,
			rate_per_sqft: data.rate_per_sqft,
			facing: data.facing || null,
		});
	}

	const { error } = await supabase.from("plots").insert(plots);

	if (error) {
		if (error.code === "23505") {
			return {
				success: false,
				error: "Some plot numbers already exist. Check for duplicates.",
			};
		}
		return { success: false, error: error.message };
	}

	revalidatePath(`/projects/${projectId}/plots`);
	revalidatePath(`/projects/${projectId}`);
	return { success: true, count: plots.length };
}

export async function updatePlot(
	id: string,
	projectId: string,
	values: PlotFormValues
): Promise<ActionResponse> {
	const parsed = plotSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	// Verify plot is still available
	const { data: plot } = await supabase
		.from("plots")
		.select("status")
		.eq("id", id)
		.single();

	if (!plot) {
		return { success: false, error: "Plot not found" };
	}

	if (plot.status !== "available") {
		return {
			success: false,
			error: "Cannot edit a plot that has an active sale or is sold",
		};
	}

	const { error } = await supabase
		.from("plots")
		.update({
			plot_number: parsed.data.plot_number,
			size_sqft: parsed.data.size_sqft,
			rate_per_sqft: parsed.data.rate_per_sqft,
			facing: parsed.data.facing || null,
			notes: parsed.data.notes || null,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id);

	if (error) {
		if (error.code === "23505") {
			return {
				success: false,
				error: "Plot number already exists in this project",
			};
		}
		return { success: false, error: error.message };
	}

	revalidatePath(`/projects/${projectId}/plots`);
	revalidatePath(`/projects/${projectId}`);
	return { success: true };
}

export async function deletePlot(
	id: string,
	projectId: string
): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: plot } = await supabase
		.from("plots")
		.select("status")
		.eq("id", id)
		.single();

	if (!plot) {
		return { success: false, error: "Plot not found" };
	}

	if (plot.status !== "available") {
		return {
			success: false,
			error: "Cannot delete a plot that has an active sale or is sold",
		};
	}

	const { error } = await supabase.from("plots").delete().eq("id", id);

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath(`/projects/${projectId}/plots`);
	revalidatePath(`/projects/${projectId}`);
	return { success: true };
}

export type PlotWithSaleInfo = {
	id: string;
	project_id: string;
	plot_number: string;
	size_sqft: number;
	rate_per_sqft: number;
	total_amount: number;
	status: "available" | "token" | "agreement" | "sold";
	facing: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	sale?: {
		id: string;
		customer_name: string;
		advisor_name: string;
		total_sale_amount: number;
		amount_paid: number;
		remaining_amount: number;
		sale_phase: string;
		token_date: string | null;
		agreement_date: string | null;
		monthly_emi: number | null;
	} | null;
	payments?: Array<{
		id: string;
		amount: number;
		payment_date: string;
		payment_mode: string;
		is_confirmed: boolean;
		slip_number: string | null;
	}>;
};

export async function getPlotsByProject(
	projectId: string
): Promise<PlotWithSaleInfo[]> {
	const supabase = await createClient();
	if (!supabase) return [];

	// Fetch all plots for this project
	const { data: plots, error } = await supabase
		.from("plots")
		.select("*")
		.eq("project_id", projectId)
		.order("plot_number", { ascending: true });

	if (error) throw new Error(error.message);
	if (!plots) return [];

	// Fetch sales for these plots
	const plotIds = plots.map((p) => p.id);

	const { data: sales } = await supabase
		.from("plot_sales")
		.select(
			`
      id,
      plot_id,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      sale_phase,
      token_date,
      agreement_date,
      monthly_emi,
      customers!inner(name),
      advisors!inner(name)
    `
		)
		.in("plot_id", plotIds)
		.eq("is_cancelled", false);

	// Build a map of plot_id → sale info
	const salesMap = new Map<string, PlotWithSaleInfo["sale"]>();
	sales?.forEach((s: any) => {
		salesMap.set(s.plot_id, {
			id: s.id,
			customer_name: s.customers?.name ?? "—",
			advisor_name: s.advisors?.name ?? "—",
			total_sale_amount: Number(s.total_sale_amount),
			amount_paid: Number(s.amount_paid ?? 0),
			remaining_amount: Number(s.remaining_amount ?? 0),
			sale_phase: s.sale_phase,
			token_date: s.token_date,
			agreement_date: s.agreement_date,
			monthly_emi: s.monthly_emi ? Number(s.monthly_emi) : null,
		});
	});

	return plots.map((plot) => ({
		id: plot.id,
		project_id: plot.project_id,
		plot_number: plot.plot_number,
		size_sqft: Number(plot.size_sqft),
		rate_per_sqft: Number(plot.rate_per_sqft),
		total_amount: Number(plot.total_amount),
		status: (plot.status as PlotWithSaleInfo["status"]) ?? "available",
		facing: plot.facing,
		notes: plot.notes,
		created_at: plot.created_at,
		updated_at: plot.updated_at,
		sale: salesMap.get(plot.id) ?? null,
		payments: [],
	}));
}

export async function getPlotWithPayments(
	plotId: string
): Promise<PlotWithSaleInfo | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data: plot, error } = await supabase
		.from("plots")
		.select("*")
		.eq("id", plotId)
		.single();

	if (error || !plot) return null;

	// Get sale
	const { data: saleRow } = await supabase
		.from("plot_sales")
		.select(
			`
      id,
      plot_id,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      sale_phase,
      token_date,
      agreement_date,
      monthly_emi,
      customers!inner(name),
      advisors!inner(name)
    `
		)
		.eq("plot_id", plotId)
		.eq("is_cancelled", false)
		.maybeSingle();

	let sale: PlotWithSaleInfo["sale"] = null;
	let payments: PlotWithSaleInfo["payments"] = [];

	if (saleRow) {
		const s = saleRow as any;
		sale = {
			id: s.id,
			customer_name: s.customers?.name ?? "—",
			advisor_name: s.advisors?.name ?? "—",
			total_sale_amount: Number(s.total_sale_amount),
			amount_paid: Number(s.amount_paid ?? 0),
			remaining_amount: Number(s.remaining_amount ?? 0),
			sale_phase: s.sale_phase,
			token_date: s.token_date,
			agreement_date: s.agreement_date,
			monthly_emi: s.monthly_emi ? Number(s.monthly_emi) : null,
		};

		// Get payments
		const { data: paymentRows } = await supabase
			.from("payments")
			.select(
				"id, amount, payment_date, payment_mode, is_confirmed, slip_number"
			)
			.eq("sale_id", s.id)
			.order("payment_date", { ascending: false });

		payments =
			paymentRows?.map((p) => ({
				id: p.id,
				amount: Number(p.amount),
				payment_date: p.payment_date,
				payment_mode: p.payment_mode,
				is_confirmed: p.is_confirmed ?? false,
				slip_number: p.slip_number,
			})) ?? [];
	}

	return {
		id: plot.id,
		project_id: plot.project_id,
		plot_number: plot.plot_number,
		size_sqft: Number(plot.size_sqft),
		rate_per_sqft: Number(plot.rate_per_sqft),
		total_amount: Number(plot.total_amount),
		status: (plot.status as PlotWithSaleInfo["status"]) ?? "available",
		facing: plot.facing,
		notes: plot.notes,
		created_at: plot.created_at,
		updated_at: plot.updated_at,
		sale,
		payments,
	};
}
