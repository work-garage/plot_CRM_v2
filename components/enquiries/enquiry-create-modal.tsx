"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import { createEnquiryCustomer } from "@/app/actions/enquiries";

const LEAD_SOURCE_OPTIONS = ["Facebook", "Referral", "Website", "Advisor", "Other"] as const;
const PROPERTY_TYPE_OPTIONS = ["Flats", "Plots", "Villas"] as const;
const SEGMENT_OPTIONS = ["Luxury", "Mid", "Affordable"] as const;
const LEAD_STATUS_OPTIONS = [
	"🆕 New Lead — Contact Pending",
	"📞 Contact Pending",
	"✅ Contact Done — Site Visit Pending",
	"🏠 Site Visit Done — Negotiation & Answer Pending",
	"🎉 Closed Won",
	"❌ Closed Lost",
] as const;

function FormLabel({ children }: { children: React.ReactNode }) {
	return <div className="text-xs font-semibold uppercase text-zinc-500 mb-1">{children}</div>;
}
function FieldGroup({ children }: { children: React.ReactNode }) {
	return <div className="space-y-1">{children}</div>;
}

export function EnquiryCreateModal({
	open,
	onOpenChange,
	projects,
	advisors = [],
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projects: Array<{ id: string; name: string }>;
	advisors?: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);

	const empty: EnquiryCustomerFormValues = {
		name: "", phone: "", alternate_phone: "",
		email: "", city: "", address: "",
		birth_date: null, project_id: null, category: "General",
		details: "", is_active: false, follow_up_date: null,
		enquiry_status: "🆕 New Lead — Contact Pending",
		lead_source: null, property_type: null, segment: null,
		budget_min: null, budget_max: null,
		preferred_location: "",
		bhk_size: "",
		advisor_id: null,
		source_advisor_id: null,
	};
	const [form, setForm] = useState<EnquiryCustomerFormValues>(empty);

	useEffect(() => {
		if (open) setForm(empty);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const set = (k: keyof EnquiryCustomerFormValues, v: any) =>
		setForm((f) => ({ ...f, [k]: v }));

	async function handleSubmit() {
		if (!form.name.trim() || !form.phone.trim()) {
			toast.error("Name and phone are required.");
			return;
		}
		// If lead source is "Advisor" and admin has advisor list, require source advisor selection
		if (form.lead_source === "Advisor" && advisors.length > 0 && !form.source_advisor_id) {
			toast.error("Please select a Source Advisor — this lead is marked as 'Advisor'.");
			return;
		}
		setSaving(true);
		try {
			const res = await createEnquiryCustomer(form);
			if (!res.success) { toast.error(res.error || "Failed"); return; }
			toast.success("Enquiry created successfully!");
			onOpenChange(false);
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>New Enquiry / Lead</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-2">
					{/* Section: Basic Details */}
					<div>
						<div className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-3 border-b pb-1">
							👤 Basic Details
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FieldGroup>
								<FormLabel>Customer Name *</FormLabel>
								<Input placeholder="Full name" value={form.name} onChange={e => set("name", e.target.value)} />
							</FieldGroup>
							<FieldGroup>
								<FormLabel>Mobile Number *</FormLabel>
								<Input placeholder="10-digit number" value={form.phone} onChange={e => set("phone", e.target.value)} maxLength={10} />
							</FieldGroup>
							<FieldGroup>
								<FormLabel>Alternate Number</FormLabel>
								<Input placeholder="10-digit number" value={form.alternate_phone || ""} onChange={e => set("alternate_phone", e.target.value)} maxLength={10} />
							</FieldGroup>
							<FieldGroup>
								<FormLabel>Email ID</FormLabel>
								<Input placeholder="customer@email.com" type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} />
							</FieldGroup>
							<FieldGroup>
								<FormLabel>City / Location</FormLabel>
								<Input placeholder="City or area" value={form.city || ""} onChange={e => set("city", e.target.value)} />
							</FieldGroup>
							<FieldGroup>
								<FormLabel>Date of Birth</FormLabel>
								<Input type="date" value={form.birth_date || ""} onChange={e => set("birth_date", e.target.value || null)} />
							</FieldGroup>
						</div>
					</div>

					{/* Section: Requirement Details */}
					<div>
						<div className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-3 border-b pb-1">
							🏠 Requirement Details
						</div>
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
								<Input type="number" placeholder="e.g. 2000000" value={form.budget_min ?? ""} onChange={e => set("budget_min", e.target.value ? Number(e.target.value) : null)} />
							</FieldGroup>
							<FieldGroup>
								<FormLabel>Budget Max (₹)</FormLabel>
								<Input type="number" placeholder="e.g. 5000000" value={form.budget_max ?? ""} onChange={e => set("budget_max", e.target.value ? Number(e.target.value) : null)} />
							</FieldGroup>
							<FieldGroup>
								<FormLabel>Preferred Location</FormLabel>
								<Input placeholder="Preferred area" value={form.preferred_location || ""} onChange={e => set("preferred_location", e.target.value)} />
							</FieldGroup>
							<FieldGroup>
								<FormLabel>BHK / Size Requirement</FormLabel>
								<Input placeholder="e.g. 2BHK, 1200 sqft" value={form.bhk_size || ""} onChange={e => set("bhk_size", e.target.value)} />
							</FieldGroup>
						</div>
					</div>

					{/* Section: Lead Information */}
					<div>
						<div className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-3 border-b pb-1">
							📊 Lead Information
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FieldGroup>
								<FormLabel>Lead Source</FormLabel>
								<Select value={form.lead_source || ""} onValueChange={v => set("lead_source", v || null)}>
									<SelectTrigger><SelectValue placeholder="How did they find us?" /></SelectTrigger>
									<SelectContent>
										{LEAD_SOURCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
									</SelectContent>
								</Select>
							</FieldGroup>
							<FieldGroup>
								<FormLabel>Lead Status</FormLabel>
								<Select value={form.enquiry_status || "🆕 New Lead — Contact Pending"} onValueChange={v => set("enquiry_status", v)}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										{LEAD_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
									</SelectContent>
								</Select>
							</FieldGroup>

							{form.lead_source === "Advisor" && advisors.length > 0 && (
								<FieldGroup>
									<FormLabel>Source Advisor *</FormLabel>
									<Select value={form.source_advisor_id || "none"} onValueChange={v => set("source_advisor_id", v === "none" ? null : v)}>
										<SelectTrigger className="ring-2 ring-blue-500 border-blue-400">
											<SelectValue placeholder="Which advisor brought this?" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Select Advisor...</SelectItem>
											{advisors.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
										</SelectContent>
									</Select>
								</FieldGroup>
							)}

							<FieldGroup>
								<FormLabel>Interested Project</FormLabel>
								<Select value={form.project_id || "none"} onValueChange={v => set("project_id", v === "none" ? null : v)}>
									<SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
									<SelectContent>
										<SelectItem value="none">No specific project</SelectItem>
										{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
									</SelectContent>
								</Select>
							</FieldGroup>

							{advisors.length > 0 && (
								<FieldGroup>
									<FormLabel>Assigned Advisor (for Admin)</FormLabel>
									<Select value={form.advisor_id || "none"} onValueChange={v => set("advisor_id", v === "none" ? null : v)}>
										<SelectTrigger>
											<SelectValue placeholder="Assign working advisor..." />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Unassigned</SelectItem>
											{advisors.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
										</SelectContent>
									</Select>
								</FieldGroup>
							)}
							<FieldGroup>
								<FormLabel>Follow-up Date</FormLabel>
								<Input type="date" value={form.follow_up_date || ""} onChange={e => set("follow_up_date", e.target.value || null)} />
							</FieldGroup>
						</div>
						<div className="mt-4">
							<FieldGroup>
								<FormLabel>Notes / Details</FormLabel>
								<Textarea placeholder="What does the customer want? Any special requirements..." rows={3} value={form.details || ""} onChange={e => set("details", e.target.value)} />
							</FieldGroup>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={handleSubmit} disabled={saving}>
						{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
						Create Enquiry
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
