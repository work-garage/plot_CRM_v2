import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { SalesList } from "@/components/sales/sales-list";

export default async function AdvisorSalesPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const { data: sales } = await supabase
		.from("plot_sales")
		.select(
			`
      *,
      plots(plot_number, projects(name)),
      customers(name),
      advisors(name)
    `
		)
		.eq("advisor_id", advisorId)
		.eq("is_cancelled", false)
		.order("created_at", { ascending: false });

	return (
		<div className="space-y-6">
			<PageHeader
				title="My Sales"
				subtitle={`${sales?.length ?? 0} sales`}
			/>
			{(sales ?? []).length === 0 ? (
				<div className="rounded-lg border border-dashed border-zinc-300 p-16 text-center text-zinc-500">
					No sales recorded yet.
				</div>
			) : (
				<SalesList sales={sales as any[]} canCollectPayments={false} />
			)}
		</div>
	);
}

