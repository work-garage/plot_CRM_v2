import { PageHeader } from "@/components/shared/page-header";
import { SaleForm } from "@/components/sales/sale-form";
import { createClient } from "@/lib/supabase/server";
import { getAdvisors } from "@/app/actions/advisors";
import { getCustomers } from "@/app/actions/customers";
import { getAdvisorAssignments } from "@/app/actions/advisor-projects";

export default async function NewSalePage({
	searchParams,
}: {
	searchParams?: Promise<{ plotId?: string }>;
}) {
	const sp = (await searchParams) ?? {};

	const supabase = await createClient();
	if (!supabase) return <div>Database connection failed</div>;

	// Fetch available plots
	const { data: plots } = await supabase
		.from("plots")
		.select("*, projects(id, name)")
		.eq("status", "available")
		.order("plot_number", { ascending: true });

	const advisors = await getAdvisors();
	const customers = await getCustomers();
	const advisorAssignments = await getAdvisorAssignments();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Record New Sale"
				subtitle="Create a booking or full sale for a plot"
				showBackButton
			/>
			<div className="flex justify-center">
				<SaleForm
					plots={plots || []}
					customers={customers}
					advisors={advisors}
					initialPlotId={sp.plotId}
					advisorAssignments={advisorAssignments}
				/>
			</div>
		</div>
	);
}
