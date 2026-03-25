import Link from "next/link";
import { Plus, CreditCard } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getPayments } from "@/app/actions/payments";
import { PaymentsTable } from "@/components/payments/payments-table";
import { PaymentsFilters } from "@/components/payments/payments-filters";
import { PaymentsPageActions } from "@/components/payments/payments-page-actions";

export default async function PaymentsPage({
	searchParams,
}: {
	searchParams: Promise<{
		from?: string;
		to?: string;
		status?: string;
		mode?: string;
	}>;
}) {
	const params = await searchParams;

	const from = params.from ?? "";
	const to = params.to ?? "";
	const status =
		typeof params.status === "string" && params.status !== "all"
			? params.status
			: "";
	const mode =
		typeof params.mode === "string" && params.mode !== "all"
			? params.mode
			: "";

	const filteredPayments = await getPayments({
		from: from || undefined,
		to: to || undefined,
		status:
			status === "confirmed" || status === "pending"
				? status
				: "",
		mode: mode || undefined,
	});

	const hasFilters = Boolean(from || to || status || mode);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Payments"
				subtitle={`${filteredPayments.length} transactions processed`}
				action={<PaymentsPageActions />}
			/>

			<PaymentsFilters />

			{filteredPayments.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
						<CreditCard className="h-8 w-8 text-zinc-400" />
					</div>
					<h3 className="text-lg font-semibold">
						{hasFilters ? "No payments match these filters" : "No payments yet"}
					</h3>
					<p className="text-sm text-zinc-500 mt-1 mb-4">
						{hasFilters
							? "Try adjusting your filter criteria"
							: "Record your first payment installment"}
					</p>
					<Link href="/payments/new">
						<Button size="sm">
							<Plus className="h-4 w-4 mr-2" />
							Record Payment
						</Button>
					</Link>
				</div>
			) : (
				<PaymentsTable payments={filteredPayments as any[]} />
			)}
		</div>
	);
}
