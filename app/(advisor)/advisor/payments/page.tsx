import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export default async function AdvisorPaymentsPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const { data: payments } = await supabase
		.from("payments")
		.select(
			`
      *,
      customers(name),
      plot_sales!inner(advisor_id, plots(plot_number, projects(name)))
    `
		)
		.eq("plot_sales.advisor_id", advisorId)
		.order("payment_date", { ascending: false });

	return (
		<div className="space-y-6">
			<PageHeader title="My Payments" subtitle={`${payments?.length ?? 0} payments`} />

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Customer</TableHead>
								<TableHead>Plot</TableHead>
								<TableHead>Amount</TableHead>
								<TableHead>Mode</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(payments ?? []).length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-sm text-zinc-500 py-10 text-center">
										No payments yet.
									</TableCell>
								</TableRow>
							) : (
								(payments ?? []).map((p: any) => (
									<TableRow key={p.id}>
										<TableCell className="font-medium">{formatDate(p.payment_date)}</TableCell>
										<TableCell>{p.customers?.name ?? "—"}</TableCell>
										<TableCell>
											{p.plot_sales?.plots?.plot_number ?? "—"}
											<div className="text-xs text-zinc-400">
												{p.plot_sales?.plots?.projects?.name ?? ""}
											</div>
										</TableCell>
										<TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
										<TableCell className="capitalize">{p.payment_mode}</TableCell>
										<TableCell>
											{p.is_confirmed ? (
												<Badge className="bg-green-100 text-green-800 border-green-200">Pakka</Badge>
											) : (
												<Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Kaccha</Badge>
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

