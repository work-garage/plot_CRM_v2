"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import {
	MapPin,
	User,
	Calendar,
	IndianRupee,
	CreditCard,
	ArrowUpRight,
} from "lucide-react";

interface SaleDetailModalProps {
	sale: {
		id: string;
		total_sale_amount: number;
		amount_paid?: number | null;
		remaining_amount?: number | null;
		token_date?: string | null;
		agreement_date?: string | null;
		sale_phase: string;
		plots: { plot_number: string; projects?: { name: string } | null };
		customers: { name: string };
		advisors: { name: string; code?: string };
	};
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canCollectPayments?: boolean;
}

const phaseConfig: Record<string, { label: string; className: string }> = {
	token: { label: "Token", className: "bg-yellow-100 text-yellow-800" },
	agreement: { label: "Agreement", className: "bg-blue-100 text-blue-800" },
	registry: { label: "Registry", className: "bg-green-100 text-green-800" },
	full_payment: {
		label: "Full Payment",
		className: "bg-purple-100 text-purple-800",
	},
	face1: { label: "Token", className: "bg-yellow-100 text-yellow-800" },
	face2: { label: "Agreement", className: "bg-blue-100 text-blue-800" },
	face3: { label: "Registry", className: "bg-green-100 text-green-800" },
	face4: { label: "Full Payment", className: "bg-purple-100 text-purple-800" },
	face5: { label: "Face 5", className: "bg-zinc-100 text-zinc-800" },
	face6: { label: "Face 6", className: "bg-zinc-100 text-zinc-800" },
};

export function SaleDetailModal({
	sale,
	open,
	onOpenChange,
	canCollectPayments = true,
}: SaleDetailModalProps) {
	const router = useRouter();
	const phase =
		phaseConfig[sale.sale_phase] ?? {
			label: sale.sale_phase,
			className: "bg-zinc-100 text-zinc-800",
		};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
				<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<DialogTitle className="flex flex-wrap items-center gap-2 text-left">
							<span className="font-bold text-base sm:text-lg">
								{sale.plots?.plot_number ?? "—"}
							</span>
							<span
								className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${phase.className}`}
							>
								{phase.label}
							</span>
						</DialogTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0"
							onClick={() => onOpenChange(false)}
						>
							Close
						</Button>
					</div>
					{sale.plots?.projects?.name && (
						<p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
							<MapPin className="h-3.5 w-3.5 shrink-0" />
							{sale.plots.projects.name}
						</p>
					)}
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
							Amount
						</p>
						<p className="text-2xl font-bold text-zinc-900">
							{formatCurrency(sale.total_sale_amount)}
						</p>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
								Customer
							</p>
							<p className="text-sm font-semibold flex items-center gap-1">
								<User className="h-3.5 w-3.5 text-zinc-400" />
								{sale.customers?.name ?? "—"}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
								Advisor
							</p>
							<p className="text-sm font-semibold flex items-center gap-1">
								<User className="h-3.5 w-3.5 text-zinc-400" />
								{sale.advisors?.name ?? "—"}
								{sale.advisors?.code && (
									<span className="text-xs text-zinc-500 font-normal">
										({sale.advisors.code})
									</span>
								)}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
								Token Date
							</p>
							<p className="text-sm flex items-center gap-1">
								<Calendar className="h-3.5 w-3.5 text-zinc-400" />
								{sale.token_date ? formatDate(sale.token_date) : "—"}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
								Agreement Date
							</p>
							<p className="text-sm flex items-center gap-1">
								<Calendar className="h-3.5 w-3.5 text-zinc-400" />
								{sale.agreement_date ? formatDate(sale.agreement_date) : "—"}
							</p>
						</div>
					</div>

					<div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
						<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
							Payment Status
						</p>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-zinc-500">Paid</p>
								<p className="font-semibold text-green-600">
									{formatCurrency(sale.amount_paid ?? 0)}
								</p>
							</div>
							<div className="text-right">
								<p className="text-xs text-zinc-500">Remaining</p>
								<p className="font-semibold text-red-600">
									{formatCurrency(sale.remaining_amount ?? sale.total_sale_amount)}
								</p>
							</div>
						</div>
					</div>

					<div className="flex gap-2 pt-2">
						{canCollectPayments ? (
							<Link href={`/payments/new?saleId=${sale.id}`} className="flex-1">
								<Button
									size="sm"
									className="w-full"
									onClick={() => onOpenChange(false)}
								>
									<CreditCard className="h-4 w-4 mr-2" />
									Collect Payment
								</Button>
							</Link>
						) : null}
						<Button
							variant="outline"
							size="sm"
							className="shrink-0"
							onClick={() => {
								onOpenChange(false);
								router.push("/sales");
							}}
						>
							<ArrowUpRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
