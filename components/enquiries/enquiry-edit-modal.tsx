"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trophy, XCircle } from "lucide-react";
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
import type { EnquiryRow } from "@/app/actions/enquiries";
import { updateEnquiryCustomer, upgradeEnquiryToCustomer, markLeadAsLost } from "@/app/actions/enquiries";
import { CustomerFollowUps } from "./customer-follow-ups";
import { getContactStatus } from "@/lib/crm-utils";
import { cn } from "@/lib/utils";

const LEAD_SOURCE_OPTIONS = ["Facebook", "Referral", "Website", "Assigned Advisor", "Other"] as const;
const PROPERTY_TYPE_OPTIONS = ["Flats", "Plots", "Villas"] as const;
const SEGMENT_OPTIONS = ["Luxury", "Mid-range", "Affordable"] as const;
const LEAD_STATUS_OPTIONS = [
	"New Lead", "Contacted", "Follow-up",
	"Site Visit Scheduled", "Site Visit Done", "Negotiation",
	"Closed Won", "Closed Lost",
] as const;

function FormLabel({ children }: { children: React.ReactNode }) {
	return <div className="text-xs font-semibold uppercase text-zinc-500 mb-1">{children}</div>;
}
function FieldGroup({ children }: { children: React.ReactNode }) {
	return <div className="space-y-1">{children}</div>;
}

export function EnquiryEditModal({
	open,
	onOpenChange,
	enquiry,
	projects,
	advisors = [],
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	enquiry: EnquiryRow | null;
	projects: Array<{ id: string; name: string }>;
	advisors?: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [markingWon, setMarkingWon] = useState(false);
	const [markingLost, setMarkingLost] = useState(false);
	const [tab, setTab] = useState<"details" | "followup">("followup");
	const [form, setForm] = useState<EnquiryCustomerFormValues | null>(null);

	useEffect(() => {
		if (!open || !enquiry) { setForm(null); return; }
		setForm({
			name: enquiry.name,
			phone: enquiry.phone,
			alternate_phone: enquiry.alternate_phone ?? "",
			email: enquiry.email ?? "",
			city: enquiry.city ?? "",
			address: enquiry.address ?? "",
			birth_date: enquiry.birth_date,
			project_id: enquiry.project_id,
			category: enquiry.category,
			details: enquiry.details ?? "",
			is_active: enquiry.is_active,
			follow_up_date: enquiry.follow_up_date,
			interested_plan: enquiry.interested_plan,
			enquiry_status: (enquiry.lead_status as any) || "New Lead",
			lead_source: enquiry.lead_source as any || null,
			property_type: enquiry.property_type as any || null,
			segment: enquiry.segment as any || null,
			budget_min: enquiry.budget_min,
			budget_max: enquiry.budget_max,
			preferred_location: enquiry.preferred_location ?? "",
			bhk_size: enquiry.bhk_size ?? "",
			advisor_id: enquiry.advisor_id,
		});
	}, [open, enquiry]);

	const set = (k: keyof EnquiryCustomerFormValues, v: any) =>
		setForm((f) => f ? { ...f, [k]: v } : f);

	async function handleSave() {
		if (!enquiry || !form) return;
		setSaving(true);
		try {
			const res = await updateEnquiryCustomer(enquiry.id, form);
			if (!res.success) { toast.error(res.error || "Failed"); return; }
			toast.success("Lead updated successfully!");
			onOpenChange(false);
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	async function handleMarkWon() {
		if (!enquiry) return;
		setMarkingWon(true);
		try {
			const res = await upgradeEnquiryToCustomer({ enquiryId: enquiry.id });
			if (!res.success) { toast.error(res.error || "Failed"); return; }
			toast.success("🎉 Lead promoted to Customer (Closed Won)!");
			onOpenChange(false);
			router.refresh();
		} finally {
			setMarkingWon(false);
		}
	}

	async function handleMarkLost() {
		if (!enquiry) return;
		setMarkingLost(true);
		try {
			const res = await markLeadAsLost(enquiry.id);
			if (!res.success) { toast.error(res.error || "Failed"); return; }
			toast.success("Lead marked as Closed Lost.");
			onOpenChange(false);
			router.refresh();
		} finally {
			setMarkingLost(false);
		}
	}

	if (!enquiry || !form) return null;

	const isWon = enquiry.lead_status === "Closed Won";
	const isLost = enquiry.lead_status === "Closed Lost";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex flex-col gap-1">
							<DialogTitle>Lead — {enquiry.name}</DialogTitle>
							{/* Pipeline status badge for all lead states */}
							{(() => {
								const cs = getContactStatus(enquiry);
								return (
									<div className={cn(
										"inline-flex items-center self-start rounded-full border px-2.5 py-0.5 text-xs font-semibold",
										cs.color
									)}>
										{cs.label}
									</div>
								);
							})()}
						<div className="flex gap-2">
							{!isWon && !isLost && (
								<>
									<Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50"
										onClick={handleMarkWon} disabled={markingWon}>
										{markingWon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4 mr-1" />}
										Mark Won
									</Button>
									<Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
										onClick={handleMarkLost} disabled={markingLost}>
										{markingLost ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
										Mark Lost
									</Button>
								</>
							)}
							{isWon && <div className="text-xs bg-green-100 text-green-700 rounded-full px-3 py-1 font-semibold">✓ Closed Won</div>}
							{isLost && <div className="text-xs bg-red-100 text-red-700 rounded-full px-3 py-1 font-semibold">✗ Closed Lost</div>}
						</div>
					</div>
					</div>
				</DialogHeader>

				{/* Inner tabs — Follow-up Tracker FIRST */}
				<div className="flex gap-0 border-b">
					<button
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "followup" ? "border-zinc-800 text-zinc-800" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}
						onClick={() => setTab("followup")}
					>
						Follow-up Tracker
					</button>
					<button
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "details" ? "border-zinc-800 text-zinc-800" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}
						onClick={() => setTab("details")}
					>
						Lead Details
					</button>
				</div>

				{tab === "details" && (
					<div className="space-y-6 py-2">
						{/* Basic Details */}
						<div>
							<div className="text-xs font-bold uppercase text-zinc-400 mb-3 border-b pb-1">👤 Basic Details</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FieldGroup>
									<FormLabel>Customer Name *</FormLabel>
									<Input value={form.name} onChange={e => set("name", e.target.value)} />
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Mobile Number *</FormLabel>
									<Input value={form.phone} onChange={e => set("phone", e.target.value)} maxLength={10} />
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Alternate Number</FormLabel>
									<Input value={form.alternate_phone || ""} onChange={e => set("alternate_phone", e.target.value)} maxLength={10} />
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Email ID</FormLabel>
									<Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} />
								</FieldGroup>
								<FieldGroup>
									<FormLabel>City / Location</FormLabel>
									<Input value={form.city || ""} onChange={e => set("city", e.target.value)} />
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Date of Birth</FormLabel>
									<Input type="date" value={form.birth_date || ""} onChange={e => set("birth_date", e.target.value || null)} />
								</FieldGroup>
							</div>
						</div>

						{/* Requirement Details */}
						<div>
							<div className="text-xs font-bold uppercase text-zinc-400 mb-3 border-b pb-1">🏠 Requirement Details</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FieldGroup>
									<FormLabel>Property Type</FormLabel>
									<Select value={form.property_type || ""} onValueChange={v => set("property_type", v || null)}>
										<SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
										<SelectContent>
											{PROPERTY_TYPE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
										</SelectContent>
									</Select>
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Segment</FormLabel>
									<Select value={form.segment || ""} onValueChange={v => set("segment", v || null)}>
										<SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
										<SelectContent>
											{SEGMENT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
										</SelectContent>
									</Select>
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Budget Min (₹)</FormLabel>
									<Input type="number" value={form.budget_min ?? ""} onChange={e => set("budget_min", e.target.value ? Number(e.target.value) : null)} />
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Budget Max (₹)</FormLabel>
									<Input type="number" value={form.budget_max ?? ""} onChange={e => set("budget_max", e.target.value ? Number(e.target.value) : null)} />
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Preferred Location</FormLabel>
									<Input value={form.preferred_location || ""} onChange={e => set("preferred_location", e.target.value)} />
								</FieldGroup>
								<FieldGroup>
									<FormLabel>BHK / Size Requirement</FormLabel>
									<Input value={form.bhk_size || ""} onChange={e => set("bhk_size", e.target.value)} />
								</FieldGroup>
							</div>
						</div>

						{/* Lead Info */}
						<div>
							<div className="text-xs font-bold uppercase text-zinc-400 mb-3 border-b pb-1">📊 Lead Information</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FieldGroup>
									<FormLabel>Lead Source</FormLabel>
									<Select value={form.lead_source || ""} onValueChange={v => set("lead_source", v || null)}>
										<SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
										<SelectContent>
											{LEAD_SOURCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
										</SelectContent>
									</Select>
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Lead Status</FormLabel>
									<Select value={form.enquiry_status || "New Lead"} onValueChange={v => set("enquiry_status", v)}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											{LEAD_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
										</SelectContent>
									</Select>
								</FieldGroup>
								<FieldGroup>
									<FormLabel>Interested Project</FormLabel>
									<Select value={form.project_id || "none"} onValueChange={v => set("project_id", v === "none" ? null : v)}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="none">No specific project</SelectItem>
											{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
										</SelectContent>
									</Select>
								</FieldGroup>
								{advisors.length > 0 && (
									<FieldGroup>
										<FormLabel>
											Assigned Advisor
											{form.lead_source === "Assigned Advisor" && (
												<span className="ml-1 text-blue-600 text-xs font-bold">* Required</span>
											)}
										</FormLabel>
										<Select value={form.advisor_id || "none"} onValueChange={v => set("advisor_id", v === "none" ? null : v)}>
											<SelectTrigger
												className={form.lead_source === "Assigned Advisor" ? "ring-2 ring-blue-500 border-blue-400" : ""}
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">Unassigned</SelectItem>
												{advisors.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
											</SelectContent>
										</Select>
										{form.lead_source === "Assigned Advisor" && !form.advisor_id && (
											<p className="text-xs text-blue-600 mt-1">Select the advisor who brought this lead.</p>
										)}
									</FieldGroup>
								)}
								<FieldGroup>
									<FormLabel>Follow-up Date</FormLabel>
									<Input type="date" value={form.follow_up_date || ""} onChange={e => set("follow_up_date", e.target.value || null)} />
								</FieldGroup>
							</div>
							<div className="mt-4">
								<FieldGroup>
									<FormLabel>Notes</FormLabel>
									<Textarea rows={3} value={form.details || ""} onChange={e => set("details", e.target.value)} />
								</FieldGroup>
							</div>
						</div>
					</div>
				)}

				{tab === "followup" && (
					<div className="py-2">
						<CustomerFollowUps customerId={enquiry.id} />
					</div>
				)}

				{tab === "details" && (
					<div className="flex justify-end gap-2 pt-4 border-t">
						<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
							Save Changes
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
