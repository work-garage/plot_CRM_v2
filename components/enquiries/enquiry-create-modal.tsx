"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, CheckCircle2, AlertCircle } from "lucide-react";
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
import { createEnquiryCustomer, getTempCustomersByPhone } from "@/app/actions/enquiries";
import { cn } from "@/lib/utils";

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

export function EnquiryCreateModal({
	open,
	onOpenChange,
	projects,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projects: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
	const [statusText, setStatusText] = useState("");

	const emptyForm: Omit<EnquiryCustomerFormValues, "is_active"> & { is_active: boolean } = {
		name: "",
		phone: "",
		alternate_phone: "",
		address: "",
		birth_date: null,
		project_id: null,
		category: "General",
		details: "",
		is_active: false,
		follow_up_date: null,
		interested_plan: null,
		enquiry_status: "New Lead",
		lead_source: null,
		property_type: null,
		segment: null,
		budget_min: null,
		budget_max: null,
		preferred_location: "",
		bhk_size: "",
	};

	const [form, setForm] = useState<Omit<EnquiryCustomerFormValues, "is_active"> & { is_active: boolean }>({
		...emptyForm,
	});

	const [tempCustomers, setTempCustomers] = useState<
		Array<{
			id: string;
			name: string;
			phone: string;
			alternate_phone: string | null;
			address: string | null;
			birth_date: string | null;
		}>
	>([]);
	const [selectedTempCustomerId, setSelectedTempCustomerId] = useState<string>("none");

	// When user clicks "New Enquiry" again, ensure we start with a fresh form.
	useEffect(() => {
		if (!open) return;
		setForm({ ...emptyForm });
		setTempCustomers([]);
		setSelectedTempCustomerId("none");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const projectOptions = useMemo(
		() =>
			projects.map((p) => ({
				id: p.id,
				name: p.name,
			})),
		[projects]
	);

	// When phone becomes 10 digits, load matching temporary customers.
	useEffect(() => {
		const phone = form.phone.replace(/\D/g, "");
		if (phone.length !== 10) {
			setTempCustomers([]);
			setSelectedTempCustomerId("none");
			return;
		}

		void (async () => {
			try {
				const rows = await getTempCustomersByPhone(phone);
				setTempCustomers(rows);

				if (rows.length > 0) {
					const first = rows[0];
					setSelectedTempCustomerId(first.id);
					setForm((s) => ({
						...s,
						// Fill ONLY customer fields.
						name: first.name ?? s.name,
						alternate_phone: first.alternate_phone ?? "",
						address: first.address ?? "",
						birth_date: (first.birth_date ?? null) as any,
						phone: first.phone ?? s.phone,
					}));
				} else {
					setSelectedTempCustomerId("none");
				}
			} catch {
				setTempCustomers([]);
				setSelectedTempCustomerId("none");
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.phone]);

	// If user manually picks a temp customer, fill customer-related fields only.
	useEffect(() => {
		if (selectedTempCustomerId === "none") return;
		const found = tempCustomers.find((c) => c.id === selectedTempCustomerId);
		if (!found) return;

		setForm((s) => ({
			...s,
			name: found.name ?? s.name,
			alternate_phone: found.alternate_phone ?? "",
			address: found.address ?? "",
			birth_date: (found.birth_date ?? null) as any,
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTempCustomerId]);

	async function onSubmit() {
		setSaving(true);
		setSubmitStatus("idle");
		setStatusText("");
		const playSubmitTone = (kind: "success" | "error") => {
			if (typeof window === "undefined") return;
			try {
				const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
				if (!AudioCtx) return;
				const ctx = new AudioCtx();
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.value = kind === "success" ? 740 : 220;
				gain.gain.value = 0.0001;
				osc.connect(gain);
				gain.connect(ctx.destination);
				const now = ctx.currentTime;
				gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "success" ? 0.2 : 0.15));
				osc.start(now);
				osc.stop(now + (kind === "success" ? 0.22 : 0.17));
				setTimeout(() => void ctx.close(), 300);
			} catch {}
		};
		try {
			const res = await createEnquiryCustomer({
				...form,
				birth_date: form.birth_date || null,
				project_id: form.project_id || null,
				alternate_phone: form.alternate_phone || "",
				details: form.details || "",
				follow_up_date: form.follow_up_date || null,
				interested_plan: form.interested_plan || null,
				enquiry_status: form.enquiry_status ?? "new",
			} as any);

			if (!res.success) {
				toast.error("Enquiry creation failed", { description: res.error });
				setSubmitStatus("error");
				setStatusText(res.error ?? "Failed to create enquiry");
				playSubmitTone("error");
				return;
			}

			toast.success("Enquiry created");
			setSubmitStatus("success");
			setStatusText("Enquiry created successfully.");
			playSubmitTone("success");
			// Clear local form so next open starts empty.
			setForm({ ...emptyForm });
			onOpenChange(false);
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 flex flex-row flex-wrap items-center justify-between gap-3 text-left">
					<DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
						<Plus className="h-4 w-4 shrink-0" />
						New Enquiry
					</DialogTitle>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => {
								const names = [
									"Vijay Sharma",
									"Rahul Gupta",
									"Sunita Bai",
									"Ganesh Raut",
									"Deepak Tighare",
									"Manisha Kolhe",
									"Arjun Patil",
									"Priya Nair",
								];
								const routes = ["Wardha Road", "Hingna", "Besa", "Manish Nagar", "MIHAN", "Koradi"];
								const routesPick = routes[Math.floor(Math.random() * routes.length)];
								const name = names[Math.floor(Math.random() * names.length)];
								const phone = String(Math.floor(Math.random() * 9000000000) + 1000000000).slice(0, 10);
								const altPhone = String(Math.floor(Math.random() * 9000000000) + 1000000000).slice(0, 10);
								const category = CATEGORY_OPTIONS[Math.floor(Math.random() * CATEGORY_OPTIONS.length)];
								const details = `Interested in plots near ${routesPick}. Preferred contact time: Evening.`;
								const projectPick = projects.length
									? projects[Math.floor(Math.random() * projects.length)].id
									: null;

								// Force dropdown to reload on phone change.
								setTempCustomers([]);
								setSelectedTempCustomerId("none");
								setForm({
									name,
									phone,
									alternate_phone: altPhone,
									address: `Plot No ${Math.floor(Math.random() * 500) + 1}, ${routesPick}, Nagpur`,
									birth_date: "1990-08-20",
									project_id: projectPick,
									category,
									details,
									is_active: false,
									follow_up_date: null,
									interested_plan: "Quarterly",
									enquiry_status: "New Lead",
									lead_source: "Facebook",
									property_type: "Plots",
									segment: "Mid-range",
									budget_min: 1500000,
									budget_max: 3500000,
									preferred_location: routesPick,
									bhk_size: "N/A",
								});
							}}
						>
							Fill Mock Data
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Close
						</Button>
					</div>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Name
							</div>
							<Input
								value={form.name}
								onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
								placeholder="e.g. Rahul Gupta"
							/>
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Phone
							</div>
							<Input
								value={form.phone}
								inputMode="numeric"
								placeholder="10 digits"
								onChange={(e) =>
									setForm((s) => ({
										...s,
										phone: e.target.value.replace(/\D/g, "").slice(0, 10),
									}))
								}
							/>

							{tempCustomers.length > 0 && (
								<div className="space-y-2 pt-1">
									<div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
										Match temp customer
									</div>
									<Select
										value={selectedTempCustomerId}
										onValueChange={(v) => setSelectedTempCustomerId(v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select customer" />
										</SelectTrigger>
										<SelectContent>
											{tempCustomers.map((c) => (
												<SelectItem key={c.id} value={c.id}>
													{c.name} ({c.phone})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Alternate Phone
							</div>
							<Input
								value={form.alternate_phone}
								inputMode="numeric"
								placeholder="optional"
								onChange={(e) =>
									setForm((s) => ({
										...s,
										alternate_phone: e.target.value.replace(/\D/g, "").slice(0, 10),
									}))
								}
							/>
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Birth Date
							</div>
							<Input
								type="date"
								value={form.birth_date ?? ""}
								onChange={(e) =>
									setForm((s) => ({
										...s,
										birth_date: e.target.value || null,
									}))
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Project
							</div>
							<Select
								value={form.project_id ?? "none"}
								onValueChange={(v) =>
									setForm((s) => ({
										...s,
										project_id: v === "none" ? null : v,
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select project (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No project</SelectItem>
									{projectOptions.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Enquiry Category
							</div>
							<Select
								value={form.category}
								onValueChange={(v) => setForm((s) => ({ ...s, category: v }))}
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

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Property Type</div>
							<Select value={form.property_type ?? "none"} onValueChange={(v) => setForm((s) => ({ ...s, property_type: v === "none" ? null : (v as any) }))}>
								<SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Any</SelectItem>
									{PROPERTY_TYPE_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Segment</div>
							<Select value={form.segment ?? "none"} onValueChange={(v) => setForm((s) => ({ ...s, segment: v === "none" ? null : (v as any) }))}>
								<SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Any</SelectItem>
									{SEGMENT_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Lead Source</div>
							<Select value={form.lead_source ?? "none"} onValueChange={(v) => setForm((s) => ({ ...s, lead_source: v === "none" ? null : (v as any) }))}>
								<SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Unknown</SelectItem>
									{LEAD_SOURCE_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Budget Range</div>
							<div className="flex items-center gap-2">
								<Input type="number" placeholder="Min ₹" value={form.budget_min ?? ""} onChange={(e) => setForm((s) => ({ ...s, budget_min: Number(e.target.value) || null }))} />
								<span>-</span>
								<Input type="number" placeholder="Max ₹" value={form.budget_max ?? ""} onChange={(e) => setForm((s) => ({ ...s, budget_max: Number(e.target.value) || null }))} />
							</div>
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pref. Location / BHK</div>
							<div className="flex items-center gap-2">
								<Input placeholder="Location" value={form.preferred_location} onChange={(e) => setForm((s) => ({ ...s, preferred_location: e.target.value }))} />
								<Input placeholder="BHK (e.g. 2BHK)" className="w-24 shrink-0" value={form.bhk_size} onChange={(e) => setForm((s) => ({ ...s, bhk_size: e.target.value }))} />
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
							Address
						</div>
						<Textarea
							rows={2}
							value={form.address ?? ""}
							onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
						/>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
							Enquiry Details
						</div>
						<Textarea
							rows={4}
							value={form.details}
							onChange={(e) => setForm((s) => ({ ...s, details: e.target.value }))}
							placeholder="What are they looking for? Any notes / follow-up info."
						/>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
							Follow-up date
						</div>
						<Input
							type="date"
							value={form.follow_up_date ?? ""}
							onChange={(e) =>
								setForm((s) => ({ ...s, follow_up_date: e.target.value || null }))
							}
						/>
						<p className="text-[11px] text-zinc-500">Must be on or after visit date (if applicable).</p>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
							Interested plan
						</div>
						<div className="flex flex-wrap gap-2">
							{ENQUIRY_PLAN_OPTIONS.map((plan) => (
								<button
									key={plan}
									type="button"
									onClick={() => setForm((s) => ({ ...s, interested_plan: plan }))}
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
						<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pipeline Status</div>
						<div className="flex flex-wrap gap-2">
							{LEAD_STATUS_OPTIONS.map(([value, label]) => (
								<button
									key={value}
									type="button"
									onClick={() =>
										setForm((s) => ({
											...s,
											enquiry_status: value as any,
										}))
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

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={onSubmit}
							disabled={saving}
							className={`transition-all duration-300 ${saving ? "scale-[1.02] shadow-md" : ""}`}
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Submitting...
								</>
							) : (
								"SAVE ENQUIRY"
							)}
						</Button>
					</div>
					{submitStatus !== "idle" && (
						<div className={`mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs animate-in fade-in zoom-in-95 duration-300 ${
							submitStatus === "success"
								? "border-green-200 bg-green-50 text-green-700"
								: "border-red-200 bg-red-50 text-red-700"
						}`}>
							{submitStatus === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
							<span>{statusText}</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

