"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ShoppingCart, Calendar, User, MapPin, IndianRupee, MessageCircle } from "lucide-react";
import { openWhatsAppPaymentReminder } from "@/lib/payment-whatsapp";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { SaleDetailModal } from "./sale-detail-modal";

const phaseConfig: Record<string, { label: string; className: string }> = {
	token: { label: "Token", className: "bg-yellow-100 text-yellow-800" },
	agreement: { label: "Agreement", className: "bg-blue-100 text-blue-800" },
	registry: { label: "Registry", className: "bg-green-100 text-green-800" },
	full_payment: { label: "Full Payment", className: "bg-purple-100 text-purple-800" },
	face1: { label: "Token", className: "bg-yellow-100 text-yellow-800" },
	face2: { label: "Agreement", className: "bg-blue-100 text-blue-800" },
	face3: { label: "Registry", className: "bg-green-100 text-green-800" },
	face4: { label: "Full Payment", className: "bg-purple-100 text-purple-800" },
	face5: { label: "Face 5", className: "bg-zinc-100 text-zinc-800" },
	face6: { label: "Face 6", className: "bg-zinc-100 text-zinc-800" },
};

export function SalesList({
	sales,
	canCollectPayments = true,
}: {
	sales: any[];
	canCollectPayments?: boolean;
}) {
	const [selectedSale, setSelectedSale] = useState<any | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	const openSaleModal = (sale: any) => {
		setSelectedSale(sale);
		setModalOpen(true);
	};

	return (
		<>
			<div className="grid grid-cols-1 gap-4">
				{sales.map((sale) => {
					const phase =
						phaseConfig[sale.sale_phase] ?? {
							label: sale.sale_phase,
							className: "bg-zinc-100 text-zinc-800",
						};
					return (
						<Card
							key={sale.id}
							className="overflow-hidden hover:border-zinc-400 transition-colors cursor-pointer"
							onClick={() => openSaleModal(sale)}
						>
							<CardContent className="p-0">
								<div className="flex flex-col md:flex-row">
									<div className="p-4 md:w-1/4 bg-zinc-50 border-b md:border-b-0 md:border-r border-zinc-200">
										<div className="flex items-center gap-2 mb-1">
											<Badge className={phase.className}>{phase.label}</Badge>
											<span className="font-bold text-lg">{sale.plots?.plot_number}</span>
										</div>
										<p className="text-sm text-zinc-500 flex items-center gap-1">
											<MapPin className="h-3 w-3" /> {sale.plots?.projects?.name}
										</p>
										<div className="mt-4 space-y-1">
											<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
												Amount
											</p>
											<p className="text-lg font-bold text-zinc-900">
												{formatCurrency(sale.total_sale_amount)}
											</p>
										</div>
									</div>

									<div className="p-4 md:w-2/4 grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-3">
											<div className="flex items-start gap-2">
												<User className="h-4 w-4 text-zinc-400 mt-0.5" />
												<div>
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
														Customer
													</p>
													<p className="text-sm font-semibold">{sale.customers?.name}</p>
												</div>
											</div>
											<div className="flex items-start gap-2">
												<User className="h-4 w-4 text-zinc-400 mt-0.5" />
												<div>
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
														Advisor
													</p>
													<p className="text-sm font-semibold">{sale.advisors?.name}</p>
												</div>
											</div>
										</div>
										<div className="space-y-3 text-sm">
											<div className="flex items-start gap-2">
												<Calendar className="h-4 w-4 text-zinc-400 mt-0.5" />
												<div>
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
														Date
													</p>
													<p>
														{sale.token_date
															? formatDate(sale.token_date)
															: formatDate(sale.created_at)}
													</p>
												</div>
											</div>
											<div className="flex items-start gap-2">
												<IndianRupee className="h-4 w-4 text-zinc-400 mt-0.5" />
												<div>
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
														Paid / Remaining
													</p>
													<p className="font-medium text-green-600">
														{formatCurrency(sale.amount_paid)} /
														<span className="text-red-600 ml-1">
															{formatCurrency(sale.remaining_amount)}
														</span>
													</p>
												</div>
											</div>
										</div>
									</div>

									<div
										className="p-4 md:w-1/4 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-zinc-200"
										onClick={(e) => e.stopPropagation()}
									>
										<Button
											variant="outline"
											size="sm"
											className="w-full"
											onClick={() => openSaleModal(sale)}
										>
											View Details
										</Button>
										{sale.payment_due_meta?.is_payment_due ? (
											<Button
												size="sm"
												variant="outline"
												className="w-full gap-1 text-green-700 border-green-200"
												onClick={() =>
													openWhatsAppPaymentReminder({
														phone: sale.customers?.phone,
														customerName: sale.customers?.name ?? "Customer",
														plot: String(sale.plots?.plot_number ?? "—"),
														project: String(sale.plots?.projects?.name ?? "—"),
														remainingAmount: Number(sale.remaining_amount ?? 0),
														monthlyEmi: sale.monthly_emi,
														nextDue: sale.payment_due_meta?.next_emi_due,
													})
												}
											>
												<MessageCircle className="h-3.5 w-3.5" />
												Remind payment
											</Button>
										) : null}
										{canCollectPayments ? (
											<Link href={`/payments/new?saleId=${sale.id}`} className="w-full">
												<Button size="sm" className="w-full">
													Collect Payment
												</Button>
											</Link>
										) : null}
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{selectedSale && (
				<SaleDetailModal
					sale={selectedSale}
					open={modalOpen}
					onOpenChange={setModalOpen}
					canCollectPayments={canCollectPayments}
				/>
			)}
		</>
	);
}
