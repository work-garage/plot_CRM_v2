"use client";

import { useMemo, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea, Badge } from "@/components/ui";
import { updatePlot, deletePlot } from "@/app/actions/plots";
import { SaleBookingDialog } from "@/components/sales/sale-booking-dialog";

interface PlotForGrid {
	id: string;
	plot_number: string;
	size_sqft: number;
	rate_per_sqft: number;
	status: "available" | "token" | "agreement" | "sold" | string;
	facing: string | null;
	notes?: string | null;
	sale?: {
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
}

interface PlotLayoutGridProps {
	plots: PlotForGrid[];
	projectName?: string;
	projectId: string;
	initialPlotId?: string | null;
}

type StatusKey = "available" | "token" | "agreement" | "sold";

const STATUS_CONFIG: Record<
	StatusKey,
	{
		label: string;
		className: string;
		badgeClassName: string;
	}
> = {
	available: {
		label: "Available",
		className:
			"bg-emerald-100 border-emerald-400 hover:bg-emerald-200 text-emerald-900",
		badgeClassName: "bg-emerald-300",
	},
	token: {
		label: "Token",
		className:
			"bg-amber-100 border-amber-400 hover:bg-amber-200 text-amber-900",
		badgeClassName: "bg-amber-300",
	},
	agreement: {
		label: "Agreement",
		className:
			"bg-sky-100 border-sky-400 hover:bg-sky-200 text-sky-900",
		badgeClassName: "bg-sky-300",
	},
	sold: {
		label: "Sold",
		className: "bg-rose-100 border-rose-400 hover:bg-rose-200 text-rose-900",
		badgeClassName: "bg-rose-300",
	},
};

export function PlotLayoutGrid({
	plots,
	projectName,
	projectId,
	initialPlotId,
}: PlotLayoutGridProps) {
	const [selectedPlotId, setSelectedPlotId] = useState<string | null>(initialPlotId ?? null);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [sellOpen, setSellOpen] = useState(false);
	const router = useRouter();

	useEffect(() => {
		if (initialPlotId && plots.some((p) => p.id === initialPlotId)) {
			setSelectedPlotId(initialPlotId);
		}
	}, [initialPlotId, plots]);

	const sortedPlots = useMemo(
		() => {
			const collator = new Intl.Collator(undefined, {
				numeric: true,
				sensitivity: "base",
			});
			return [...plots].sort((a, b) =>
				collator.compare(String(a.plot_number), String(b.plot_number)),
			);
		},
		[plots],
	);

	const selectedPlot =
		sortedPlots.find((plot) => plot.id === selectedPlotId) ??
		sortedPlots[0] ??
		null;

	const isPlaceholder = selectedPlot?.id?.startsWith?.("planned-") ?? false;
	const canEdit = selectedPlot && !isPlaceholder && selectedPlot.status === "available";

	const [formState, setFormState] = useState<{
		size_sqft: number | undefined;
		rate_per_sqft: number | undefined;
		facing: string;
		notes: string;
	}>({
		size_sqft: selectedPlot?.size_sqft,
		rate_per_sqft: selectedPlot?.rate_per_sqft,
		facing: selectedPlot?.facing ?? "",
		notes: "",
	});

	// keep form in sync when selection changes
	useMemo(() => {
		if (!selectedPlot) return;
		setEditing(false);
		setFormState({
			size_sqft: selectedPlot.size_sqft,
			rate_per_sqft: selectedPlot.rate_per_sqft,
			facing: selectedPlot.facing ?? "",
			notes: selectedPlot.notes ?? "",
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPlotId]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
						Plot Layout
					</p>
					<p className="text-sm text-zinc-600">
						{projectName
							? `Interactive layout for ${projectName}`
							: `Tap on a plot to view details`}
					</p>
				</div>

				<div className="flex gap-3 text-[11px] text-zinc-600">
					<LegendPill colorClass="bg-emerald-300" label="Available" />
					<LegendPill colorClass="bg-amber-300" label="Token" />
					<LegendPill colorClass="bg-sky-300" label="Agreement" />
					<LegendPill colorClass="bg-rose-300" label="Sold" />
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-4">
				<div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-inner">
					<div
						className="grid gap-2"
						style={{
							gridTemplateColumns: `repeat(auto-fill, minmax(54px, 1fr))`,
						}}
					>
						{sortedPlots.map((plot) => {
							const statusKey: StatusKey =
								(plot.status as StatusKey) || "available";
							const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.available;

							return (
								<button
									key={plot.id}
									type="button"
									onClick={() => setSelectedPlotId(plot.id)}
									className={[
										"relative aspect-square rounded-md border text-xs font-semibold sm:min-h-[58px]",
										"flex items-center justify-center transition-all",
										"focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2",
										cfg.className,
										selectedPlotId === plot.id
											? "ring-2 ring-sky-500 ring-offset-2"
											: "",
									].join(" ")}
								>
									<span className="text-[12px] sm:text-[14px] font-bold leading-none">
										{plot.plot_number}
									</span>
									<span className="pointer-events-none absolute top-0.5 left-0 right-0 text-[8px] font-semibold text-zinc-700 hidden sm:block">
										{Number(plot.size_sqft || 0).toLocaleString("en-IN")} sqft
									</span>
									<span className="pointer-events-none absolute bottom-0.5 left-0 right-0 text-[8px] font-medium text-zinc-700 hidden sm:block">
										{cfg.label}
									</span>
								</button>
							);
						})}
					</div>
					{sortedPlots.length > 0 && (
						<div className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
							9m Wide Road
						</div>
					)}
				</div>

				<div className="w-full lg:w-96 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
					{selectedPlot ? (
						<>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-1">
								Plot Details
							</p>
							<h3 className="text-lg font-bold text-zinc-900 mb-3">
								Plot #{selectedPlot.plot_number}
							</h3>

							<div className="flex flex-wrap gap-2 mb-3">
								<Badge variant="secondary" className="capitalize">
									{(selectedPlot.status || "available") as string}
								</Badge>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setEditing((v) => !v)}
									disabled={saving || !canEdit}
								>
									{editing ? "Cancel Edit" : "Edit"}
								</Button>
								<Button
									size="sm"
									disabled={saving || !canEdit}
									onClick={() => setSellOpen(true)}
								>
									Sell / Book
								</Button>
								<Button
									size="sm"
									variant="destructive"
									disabled={saving || !canEdit}
									onClick={async () => {
										setSaving(true);
										try {
											const res = await deletePlot(selectedPlot.id, projectId);
											if (!res.success) {
												toast.error("Delete failed", { description: res.error });
												return;
											}
											toast.success("Plot deleted");
											router.refresh();
										} finally {
											setSaving(false);
										}
									}}
								>
									Delete
								</Button>
							</div>

							{editing ? (
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-3">
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
												Size (sqft)
											</p>
											<Input
												type="number"
												value={formState.size_sqft ?? ""}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													setFormState((s) => ({
														...s,
														size_sqft: sanitized === "" ? undefined : Number(sanitized),
													}));
												}}
											/>
										</div>
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
												Rate / sqft
											</p>
											<Input
												type="number"
												value={formState.rate_per_sqft ?? ""}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													setFormState((s) => ({
														...s,
														rate_per_sqft: sanitized === "" ? undefined : Number(sanitized),
													}));
												}}
											/>
										</div>
									</div>
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
											Facing
										</p>
										<Input
											value={formState.facing}
											onChange={(e) =>
												setFormState((s) => ({ ...s, facing: e.target.value }))
											}
										/>
									</div>
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
											Notes
										</p>
										<Textarea
											rows={3}
											value={formState.notes}
											onChange={(e) =>
												setFormState((s) => ({ ...s, notes: e.target.value }))
											}
										/>
									</div>
									<Button
										disabled={saving}
										onClick={async () => {
											setSaving(true);
											try {
												const res = await updatePlot(selectedPlot.id, projectId, {
													plot_number: selectedPlot.plot_number,
													size_sqft: formState.size_sqft,
													rate_per_sqft: formState.rate_per_sqft,
													facing: formState.facing,
													notes: formState.notes,
												} as any);
												if (!res.success) {
													toast.error("Save failed", { description: res.error });
													return;
												}
												toast.success("Plot updated");
												setEditing(false);
												router.refresh();
											} finally {
												setSaving(false);
											}
										}}
									>
										Save Changes
									</Button>
								</div>
							) : (
								<div className="grid grid-cols-1 gap-2 text-sm">
									<ModalField label="Facing">
										{selectedPlot.facing || "—"}
									</ModalField>
									<ModalField label="Size">
										{selectedPlot.size_sqft || 0} sqft
									</ModalField>
									<ModalField label="Rate / sqft">
										₹ {(selectedPlot.rate_per_sqft || 0).toLocaleString("en-IN")}
									</ModalField>
									<ModalField label="Total Value">
										₹{" "}
										{(
											(selectedPlot.size_sqft || 0) *
											(selectedPlot.rate_per_sqft || 0)
										).toLocaleString("en-IN")}
									</ModalField>
									{selectedPlot.notes && (
										<div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 col-span-full">
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
												Notes
											</p>
											<p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">
												{selectedPlot.notes}
											</p>
										</div>
									)}
								</div>
							)}

							{selectedPlot.sale && (
								<div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-2">
										Sale Details
									</p>
									<div className="grid grid-cols-1 gap-2 text-sm">
										<ModalField label="Customer">
											{selectedPlot.sale.customer_name}
										</ModalField>
										<ModalField label="Advisor">
											{selectedPlot.sale.advisor_name}
										</ModalField>
										<ModalField label="Sale Phase">
											{selectedPlot.sale.sale_phase}
										</ModalField>
										<ModalField label="Total Sale Amount">
											₹{" "}
											{selectedPlot.sale.total_sale_amount.toLocaleString(
												"en-IN",
											)}
										</ModalField>
										<ModalField label="Amount Paid">
											₹{" "}
											{selectedPlot.sale.amount_paid.toLocaleString("en-IN")}
										</ModalField>
										<ModalField label="Pending Amount">
											₹{" "}
											{selectedPlot.sale.remaining_amount.toLocaleString(
												"en-IN",
											)}
										</ModalField>
									</div>
								</div>
							)}

							{projectName && (
								<SaleBookingDialog
									open={sellOpen}
									onOpenChange={setSellOpen}
									projectName={projectName}
									projectId={projectId}
									plot={selectedPlot as any}
								/>
							)}
						</>
					) : (
						<div className="flex h-full flex-col items-center justify-center text-center text-xs text-zinc-500">
							<p className="mb-1 font-medium">No plot selected</p>
							<p>Tap a plot on the left to view details.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function LegendPill({
	colorClass,
	label,
}: {
	colorClass: string;
	label: string;
}) {
	return (
		<span className="inline-flex items-center gap-1">
			<span
				className={`h-3 w-3 rounded-full border border-white shadow ${colorClass}`}
			/>
			{label}
		</span>
	);
}

function DetailRow({
	label,
	children,
	icon: Icon,
}: {
	label: string;
	children: React.ReactNode;
	icon?: LucideIcon;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-1.5 text-zinc-500">
				{Icon && <Icon className="h-3 w-3" />}
				<span>{label}</span>
			</div>
			<div className="font-medium text-zinc-900">{children}</div>
		</div>
	);
}

function ModalField({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-zinc-200 bg-white p-3">
			<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
				{label}
			</p>
			<p className="mt-1 font-medium text-zinc-900">{children}</p>
		</div>
	);
}

