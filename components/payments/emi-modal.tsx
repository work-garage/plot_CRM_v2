"use client";

import React, { useState, useEffect } from "react";
import {
	CreditCard,
	User,
	Home,
	Calendar,
	MessageSquare,
	ChevronDown,
	ChevronRight,
	Loader2,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Button,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Badge,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { getEmiSales } from "@/app/actions/emi";

interface EmiModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EmiModal({ open, onOpenChange }: EmiModalProps) {
	const [sales, setSales] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setLoading(true);
			getEmiSales()
				.then(setSales)
				.finally(() => setLoading(false));
		}
	}, [open]);

	const handleRemind = (sale: any) => {
		const phone = sale.customers?.phone;
		if (!phone) return;
		const formatted = phone.replace(/\D/g, "");
		const withCode = formatted.startsWith("91") ? formatted : `91${formatted}`;
		const name = sale.customers?.name ?? "Customer";
		const plot = sale.plots?.plot_number ?? "";
		const project = sale.plots?.projects?.name ?? "";
		const amount = formatCurrency(sale.monthly_emi ?? 0);
		const dueDate = sale.next_emi_due ? formatDate(sale.next_emi_due) : "";
		const message = `Hi ${name}, your EMI of ${amount} for plot ${plot}${project ? ` (${project})` : ""} is due on ${dueDate}. Please pay before the due date.`;
		window.open(
			`https://wa.me/${withCode}?text=${encodeURIComponent(message)}`,
			"_blank"
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5" />
						EMI Transactions
					</DialogTitle>
				</DialogHeader>

				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
					</div>
				) : sales.length === 0 ? (
					<div className="py-12 text-center text-zinc-500">
						No EMI transactions with outstanding balance
					</div>
				) : (
					<div className="overflow-auto min-h-0 flex-1 -mx-1 px-1">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-8" />
									<TableHead>Customer / Plot</TableHead>
									<TableHead>Project</TableHead>
									<TableHead>Sold By</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead className="text-right">Paid</TableHead>
									<TableHead className="text-right">Remaining</TableHead>
									<TableHead className="text-right">EMI</TableHead>
									<TableHead>Next Due</TableHead>
									<TableHead className="w-20" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{sales.map((sale) => (
									<React.Fragment key={sale.id}>
										<TableRow
											key={sale.id}
											className="cursor-pointer hover:bg-zinc-50"
											onClick={() =>
												setExpandedId(expandedId === sale.id ? null : sale.id)
											}
										>
											<TableCell>
												{expandedId === sale.id ? (
													<ChevronDown className="h-4 w-4 text-zinc-500" />
												) : (
													<ChevronRight className="h-4 w-4 text-zinc-500" />
												)}
											</TableCell>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-medium flex items-center gap-1">
														<User className="h-3.5 w-3.5 text-zinc-400" />
														{sale.customers?.name ?? "—"}
													</span>
													<span className="text-xs text-zinc-500 flex items-center gap-1">
														<Home className="h-3 w-3 text-zinc-400" />
														{sale.plots?.plot_number ?? "—"}
													</span>
												</div>
											</TableCell>
											<TableCell className="text-sm">
												{sale.plots?.projects?.name ?? "—"}
											</TableCell>
											<TableCell>
												{sale.sold_by_admin ? (
													<Badge variant="outline" className="text-xs">
														Admin
													</Badge>
												) : (
													<span className="text-sm">{sale.advisors?.name ?? "—"}</span>
												)}
											</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(sale.total_sale_amount)}
											</TableCell>
											<TableCell className="text-right text-green-600">
												{formatCurrency(sale.amount_paid)}
											</TableCell>
											<TableCell className="text-right text-red-600 font-medium">
												{formatCurrency(sale.remaining_amount)}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(sale.monthly_emi)}
											</TableCell>
											<TableCell>
												{sale.is_emi_due_today ? (
													<Badge className="bg-amber-100 text-amber-800 border-amber-200">
														EMI Pending Today
													</Badge>
												) : (
													<span className="text-sm flex items-center gap-1">
														<Calendar className="h-3.5 w-3.5 text-zinc-400" />
														{sale.next_emi_due ? formatDate(sale.next_emi_due) : "—"}
													</span>
												)}
											</TableCell>
											<TableCell onClick={(e) => e.stopPropagation()}>
												<Button
													size="sm"
													variant="ghost"
													className="h-8 text-green-600 hover:bg-green-50 hover:text-green-700"
													onClick={() => handleRemind(sale)}
													disabled={!sale.customers?.phone}
												>
													<MessageSquare className="h-4 w-4" />
												</Button>
											</TableCell>
										</TableRow>
										{expandedId === sale.id && (
											<TableRow className="bg-zinc-50/50">
												<TableCell colSpan={10} className="p-4">
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
														<div>
															<div className="font-semibold text-zinc-700 mb-2">EMI Details</div>
															<div className="space-y-1">
																<div>Customer: {sale.customers?.name ?? "—"}</div>
																<div>Phone: {sale.customers?.phone ?? "—"}</div>
																<div>Plot: {sale.plots?.plot_number ?? "—"} ({sale.plots?.projects?.name ?? "—"})</div>
																<div>Sold by: {sale.sold_by_admin ? "Admin" : sale.advisors?.name ?? "—"}</div>
																<div>Monthly EMI: {formatCurrency(sale.monthly_emi)} (Day {sale.emi_day})</div>
																<div>Next follow-up: {sale.next_emi_due ? formatDate(sale.next_emi_due) : "—"}</div>
															</div>
														</div>
														<div className="flex items-end">
															<Button
																size="sm"
																variant="outline"
																className="text-green-600 border-green-200 hover:bg-green-50"
																onClick={() => handleRemind(sale)}
																disabled={!sale.customers?.phone}
															>
																<MessageSquare className="h-4 w-4 mr-2" />
																Remind via WhatsApp
															</Button>
														</div>
													</div>
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
