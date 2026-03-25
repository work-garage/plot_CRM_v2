"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Textarea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";
import type { EnquiryCustomerFormValues } from "@/lib/validations/enquiry";
import { ENQUIRY_PLAN_OPTIONS } from "@/lib/validations/enquiry";
import type { EnquiryRow } from "@/app/actions/enquiries";
import { updateEnquiryCustomer } from "@/app/actions/enquiries";
import { cn } from "@/lib/utils";
import { CustomerFollowUps } from "./customer-follow-ups";

const CATEGORY_OPTIONS = [
	"General",
	"Site Visit",
	"WhatsApp",
	"Booking",
	"Follow-up",
	"Referral",
	"Other",
] as const;

const LEAD_SOURCE_OPTIONS = ["Facebook", "Broker", "Referral", "Website", "Other"] as const;
const PROPERTY_TYPE_OPTIONS = ["Flats", "Plots", "Villas"] as const;
const SEGMENT_OPTIONS = ["Luxury", "Mid-range", "Affordable"] as const;
const LEAD_STATUS_OPTIONS = [
	["New Lead", "New Lead"],
	["Contacted", "Contacted"],
	["Follow-up", "Follow-up"],
	["Site Visit Scheduled", "Site Visit Scheduled"],
	["Site Visit Done", "Site Visit Done"],
	["Negotiation", "Negotiation"],
	["Closed Won", "Closed Won"],
	["Closed Lost", "Closed Lost"]
] as const;

export function EnquiryEditModal({
	open,
	onOpenChange,
	enquiry,
	projects,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	enquiry: EnquiryRow | null;
	projects: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState<EnquiryCustomerFormValues | null>(null);

	useEffect(() => {
		if (!open || !enquiry) {
			setForm(null);
			return;
		}
		setForm({
			name: enquiry.name,
			phone: enquiry.phone,
			alternate_phone: enquiry.alternate_phone ?? "",
			address: enquiry.address ?? "",
			birth_date: enquiry.birth_date,
			project_id: enquiry.project_id,
			category: enquiry.category,
			details: enquiry.details ?? "",
			is_active: false,
			follow_up_date: enquiry.follow_up_date,
			interested_plan: enquiry.interested_plan,
			enquiry_status: (enquiry.enquiry_status as any) ?? "New Lead",
			lead_source: enquiry.lead_source as any ?? null,
			property_type: enquiry.property_type as any ?? null,
			segment: enquiry.segment as any ?? null,
			budget_min: enquiry.budget_min ?? null,
			budget_max: enquiry.budget_max ?? null,
			preferred_location: enquiry.preferred_location ?? "",
			bhk_size: enquiry.bhk_size ?? "",
		});
	}, [open, enquiry]);

	async function onSubmit() {
		if (!form || !enquiry) return;
		setSaving(true);
		try {
			const res = await updateEnquiryCustomer(enquiry.id, {
				...form,
				birth_date: form.birth_date || null,
				project_id: form.project_id || null,
				alternate_phone: form.alternate_phone || "",
				details: form.details || "",
				follow_up_date: form.follow_up_date || null,
				interested_plan: form.interested_plan || null,
			});
			if (!res.success) {
				toast.error(res.error ?? "Update failed");
				return;
			}
			toast.success("Enquiry updated");
			onOpenChange(false);
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit enquiry</DialogTitle>
				</DialogHeader>
				{!form || !enquiry ? (
					<div className="flex justify-center py-10">
						<Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
					</div>
				) : (
				<div className="space-y-4 pt-2">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Name</div>
							<Input value={form.name} onChange={(e) => setForm((s) => s && { ...s, name: e.target.value })} />
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Phone</div>
							<Input
								value={form.phone}
								inputMode="numeric"
								onChange={(e) =>
									setForm(
										(s) => s && { ...s, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }
									)
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Property Type</div>
							<Select value={form.property_type ?? "none"} onValueChange={(v) => setForm((s) => s && { ...s, property_type: v === "none" ? null : (v as any) })}>
								<SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Any</SelectItem>
									{PROPERTY_TYPE_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Segment</div>
							<Select value={form.segment ?? "none"} onValueChange={(v) => setForm((s) => s && { ...s, segment: v === "none" ? null : (v as any) })}>
								<SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Any</SelectItem>
									{SEGMENT_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Lead Source</div>
							<Select value={form.lead_source ?? "none"} onValueChange={(v) => setForm((s) => s && { ...s, lead_source: v === "none" ? null : (v as any) })}>
								<SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Unknown</SelectItem>
									{LEAD_SOURCE_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Budget Range</div>
							<div className="flex items-center gap-2">
								<Input type="number" placeholder="Min ₹" value={form.budget_min ?? ""} onChange={(e) => setForm((s) => s && { ...s, budget_min: Number(e.target.value) || null })} />
								<span>-</span>
								<Input type="number" placeholder="Max ₹" value={form.budget_max ?? ""} onChange={(e) => setForm((s) => s && { ...s, budget_max: Number(e.target.value) || null })} />
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Pref. Location / BHK</div>
							<div className="flex items-center gap-2">
								<Input placeholder="Location" value={form.preferred_location ?? ""} onChange={(e) => setForm((s) => s && { ...s, preferred_location: e.target.value })} />
								<Input placeholder="BHK (e.g. 2BHK)" className="w-24 shrink-0" value={form.bhk_size ?? ""} onChange={(e) => setForm((s) => s && { ...s, bhk_size: e.target.value })} />
							</div>
						</div>
					</div>

					<div className="space-y-1">
						<div className="text-xs font-semibold uppercase text-zinc-500">Follow-up date</div>
						<Input
							type="date"
							value={form.follow_up_date ?? ""}
							onChange={(e) =>
								setForm((s) => s && { ...s, follow_up_date: e.target.value || null })
							}
						/>
						<p className="text-[11px] text-muted-foreground">Must be on or after visit / enquiry date if you track visits.</p>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase text-zinc-500">Interested plan</div>
						<div className="flex flex-wrap gap-2">
							{ENQUIRY_PLAN_OPTIONS.map((plan) => (
								<button
									key={plan}
									type="button"
									onClick={() => setForm((s) => s && { ...s, interested_plan: plan })}
									className={cn(
										"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
										form.interested_plan === plan
											? "border-blue-600 bg-blue-600 text-white"
											: "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
									)}
								>
									{plan}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase text-zinc-500">Pipeline Status</div>
						<div className="flex flex-wrap gap-2">
							{LEAD_STATUS_OPTIONS.map(([value, label]) => (
								<button
									key={value}
									type="button"
									onClick={() =>
										setForm((s) =>
											s
												? {
														...s,
														enquiry_status: value as EnquiryCustomerFormValues["enquiry_status"],
													}
												: s
										)
									}
									className={cn(
										"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
										form.enquiry_status === value
											? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
											: "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
									)}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Project</div>
							<Select
								value={form.project_id ?? "none"}
								onValueChange={(v) =>
									setForm((s) => s && { ...s, project_id: v === "none" ? null : v })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Project" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No project</SelectItem>
									{projects.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Category</div>
							<Select
								value={form.category}
								onValueChange={(v) => setForm((s) => s && { ...s, category: v })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CATEGORY_OPTIONS.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-1">
						<div className="text-xs font-semibold uppercase text-zinc-500">Notes / remarks</div>
						<Textarea
							rows={4}
							value={form.details}
							onChange={(e) => setForm((s) => s && { ...s, details: e.target.value })}
							placeholder="Additional notes…"
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2 pb-4 border-b">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="button" onClick={onSubmit} disabled={saving}>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save enquiry"}
						</Button>
					</div>

					<div className="pt-2 pb-6">
						<CustomerFollowUps customerId={enquiry.id} />
					</div>
				</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
