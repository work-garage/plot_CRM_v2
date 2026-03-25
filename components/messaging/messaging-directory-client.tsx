"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Send, Filter, Cake } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import {
	Button,
	Badge,
	Card,
	CardContent,
	Input,
	Checkbox,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MessagingPerson } from "@/app/actions/messaging-directory";
import {
	REMINDER_TEMPLATES,
	fillTemplate,
	getStoredTemplateId,
	getTemplateForType,
	setStoredTemplateId,
	type ReminderType,
	type MessageTemplate,
} from "@/lib/reminder-templates";
import { BulkSendModal } from "@/components/messaging/bulk-send-modal";

function personKey(p: MessagingPerson) {
	return `${p.role}:${p.id}`;
}

function isBirthdayToday(iso: string | null): boolean {
	if (!iso) return false;
	const t = iso.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
	const [y, m, d] = t.split("-").map(Number);
	const bd = new Date(y, m - 1, d);
	const now = new Date();
	return bd.getMonth() === now.getMonth() && bd.getDate() === now.getDate();
}

function openWhatsApp(phone: string | null, text: string) {
	if (!phone) {
		toast.error("No phone number");
		return;
	}
	const formatted = phone.replace(/\D/g, "").replace(/^0/, "");
	const wa = formatted.startsWith("91") ? formatted : `91${formatted}`;
	window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, "_blank");
}

function buildPreview(person: MessagingPerson, body: string): string {
	return fillTemplate(body, {
		name: person.name,
		date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" }),
	});
}

export function MessagingDirectoryClient({ initialPeople }: { initialPeople: MessagingPerson[] }) {
	const router = useRouter();
	const [people] = useState(initialPeople);
	const [query, setQuery] = useState("");
	const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all");
	const [roleTab, setRoleTab] = useState<"all" | "customer" | "advisor" | "employee">("all");
	const [birthdayOnly, setBirthdayOnly] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [bulkOpen, setBulkOpen] = useState(false);
	const [previewRole, setPreviewRole] = useState<MessagingPerson["role"]>("customer");

	const birthdayCustomerGroup = REMINDER_TEMPLATES.find((g) => g.type === "birthday_customer")!;
	const birthdayAdvisorGroup = REMINDER_TEMPLATES.find((g) => g.type === "birthday_advisor")!;

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return people.filter((p) => {
			if (statusTab === "active" && !p.is_active) return false;
			if (statusTab === "inactive" && p.is_active) return false;
			if (roleTab !== "all" && p.role !== roleTab) return false;
			if (birthdayOnly && !isBirthdayToday(p.birth_date)) return false;
			if (!q) return true;
			const hay = `${p.name} ${p.phone ?? ""} ${p.subtitle ?? ""}`.toLowerCase();
			return hay.includes(q);
		});
	}, [people, query, statusTab, roleTab, birthdayOnly]);

	const selectedInView = useMemo(() => {
		return filtered.filter((p) => selected.has(personKey(p)));
	}, [filtered, selected]);

	const toggleOne = (p: MessagingPerson) => {
		const k = personKey(p);
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(k)) next.delete(k);
			else next.add(k);
			return next;
		});
	};

	const selectAllInView = () => {
		setSelected(new Set(filtered.map(personKey)));
	};

	const clearSelection = () => setSelected(new Set());

	const handleSendOne = (p: MessagingPerson) => {
		const type: ReminderType = p.role === "advisor" ? "birthday_advisor" : "birthday_customer";
		const tmpl = getTemplateForType(type, getStoredTemplateId(type));
		if (!tmpl) {
			toast.error("No template");
			return;
		}
		const msg = buildPreview(p, tmpl.body);
		openWhatsApp(p.phone, msg);
	};

	const queueForBulk = useMemo(() => {
		if (selectedInView.length > 0) return selectedInView;
		return filtered;
	}, [selectedInView, filtered]);

	const openBulk = () => {
		const q = selectedInView.length > 0 ? selectedInView : filtered;
		if (q.length === 0) {
			toast.error("No people in the current list");
			return;
		}
		setBulkOpen(true);
	};

	const previewTemplateBody = useMemo(() => {
		const type =
			previewRole === "advisor" ? "birthday_advisor" : "birthday_customer";
		const tmpl = getTemplateForType(type, getStoredTemplateId(type));
		return tmpl?.body ?? "";
	}, [previewRole]);

	const samplePerson: MessagingPerson = useMemo(
		() => ({
			id: "sample",
			role: previewRole === "advisor" ? "advisor" : previewRole === "employee" ? "employee" : "customer",
			name: "Sample Name",
			phone: "9876543210",
			birth_date: null,
			is_active: true,
		}),
		[previewRole]
	);

	const pickTemplate = (type: ReminderType, t: MessageTemplate) => {
		setStoredTemplateId(type, t.id);
		toast.success("Template saved");
	};

	return (
		<div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-6 md:px-0">
			<PageHeader
				title="Messaging"
				subtitle="Send WhatsApp messages — customers, advisors, and employees"
			/>

			<div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				{(
					[
						["all", "All members"],
						["active", "Active"],
						["inactive", "Inactive"],
					] as const
				).map(([v, label]) => (
					<button
						key={v}
						type="button"
						onClick={() => setStatusTab(v)}
						className={cn(
							"rounded-lg px-4 py-2 text-sm font-medium transition-colors",
							statusTab === v
								? "bg-blue-600 text-white shadow-sm"
								: "text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900"
						)}
					>
						{label}
					</button>
				))}
			</div>

			<Card className="border-zinc-200 shadow-sm dark:border-zinc-800">
				<CardContent className="p-4 md:p-5 space-y-4">
					<div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
						<Filter className="h-4 w-4 text-blue-600" />
						Role &amp; events
					</div>
					<div className="flex flex-wrap gap-2">
						{(
							[
								["all", "All roles"],
								["customer", "Customers"],
								["advisor", "Advisors"],
								["employee", "Employees"],
							] as const
						).map(([v, label]) => (
							<button
								key={v}
								type="button"
								onClick={() => setRoleTab(v)}
								className={cn(
									"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
									roleTab === v
										? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
										: "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
								)}
							>
								{label}
							</button>
						))}
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => setBirthdayOnly(false)}
							className={cn(
								"rounded-full border px-3 py-1.5 text-xs font-medium",
								!birthdayOnly
									? "border-zinc-900 bg-zinc-900 text-white"
									: "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800"
							)}
						>
							All dates
						</button>
						<button
							type="button"
							onClick={() => setBirthdayOnly(true)}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
								birthdayOnly
									? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
									: "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800"
							)}
						>
							<Cake className="h-3.5 w-3.5" />
							Birthday today
						</button>
					</div>
				</CardContent>
			</Card>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by name, phone…"
					className="h-11 rounded-xl border-zinc-200 pl-10 pr-12 dark:border-zinc-800"
				/>
				<button
					type="button"
					className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
					onClick={() => router.refresh()}
					aria-label="Refresh"
				>
					<RefreshCw className="h-4 w-4" />
				</button>
			</div>

			<Card className="border-zinc-200 shadow-sm dark:border-zinc-800 overflow-hidden">
				<CardContent className="p-4 md:p-5 space-y-4">
					<div className="flex items-center justify-between gap-2">
						<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Message templates</h3>
						<span className="text-xs text-muted-foreground">Birthday · WhatsApp</span>
					</div>
					<p className="text-xs text-muted-foreground">
						Choose a template per audience. Used when you tap Send or run bulk send.
					</p>
					<div className="space-y-3">
						<div>
							<p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
								Customers &amp; employees
							</p>
							<div className="flex flex-wrap gap-2">
								{birthdayCustomerGroup.templates.map((t) => (
									<button
										key={t.id}
										type="button"
										onClick={() => pickTemplate("birthday_customer", t)}
										className={cn(
											"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
											getStoredTemplateId("birthday_customer") === t.id ||
												(!getStoredTemplateId("birthday_customer") && t.id === birthdayCustomerGroup.templates[0].id)
												? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50"
												: "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800"
										)}
									>
										{t.name}
									</button>
								))}
							</div>
						</div>
						<div>
							<p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Advisors</p>
							<div className="flex flex-wrap gap-2">
								{birthdayAdvisorGroup.templates.map((t) => (
									<button
										key={t.id}
										type="button"
										onClick={() => pickTemplate("birthday_advisor", t)}
										className={cn(
											"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
											getStoredTemplateId("birthday_advisor") === t.id ||
												(!getStoredTemplateId("birthday_advisor") && t.id === birthdayAdvisorGroup.templates[0].id)
												? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50"
												: "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800"
										)}
									>
										{t.name}
									</button>
								))}
							</div>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
						<span className="text-xs text-muted-foreground">Preview as:</span>
						{(["customer", "advisor", "employee"] as const).map((r) => (
							<button
								key={r}
								type="button"
								onClick={() => setPreviewRole(r)}
								className={cn(
									"rounded-md px-2 py-1 text-xs font-medium",
									previewRole === r ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800"
								)}
							>
								{r}
							</button>
						))}
					</div>
					<div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100 whitespace-pre-wrap min-h-[100px]">
						{buildPreview(samplePerson, previewTemplateBody)}
					</div>
					<p className="text-[10px] text-muted-foreground">
						Placeholders: [name], [date], [company], [company_phone]
					</p>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">{filtered.length}</span> members
					{" · "}
					<span className="font-semibold text-blue-700 dark:text-blue-300">{selectedInView.length}</span> selected
				</p>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" size="sm" onClick={selectAllInView}>
						Select all in view
					</Button>
					<Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
						Clear
					</Button>
					<Button
						type="button"
						size="sm"
						className="bg-blue-600 hover:bg-blue-700"
						onClick={openBulk}
						disabled={filtered.length === 0}
					>
						Send to all ({selectedInView.length > 0 ? selectedInView.length : filtered.length})
					</Button>
				</div>
			</div>

			<div className="space-y-3">
				{filtered.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="py-16 text-center text-sm text-muted-foreground">
							No people match these filters.
						</CardContent>
					</Card>
				) : (
					filtered.map((p) => {
						const k = personKey(p);
						const checked = selected.has(k);
						return (
							<Card
								key={k}
								className="border-zinc-200 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800"
							>
								<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
									<div className="flex items-start gap-3 min-w-0 flex-1">
										<Checkbox
											checked={checked}
											onCheckedChange={() => toggleOne(p)}
											className="mt-1"
										/>
										<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
											{p.name.charAt(0).toUpperCase()}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{p.name}</span>
												{p.is_active ? (
													<Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
												) : (
													<Badge variant="secondary">Inactive</Badge>
												)}
												<Badge variant="outline" className="capitalize">
													{p.role}
												</Badge>
											</div>
											<p className="text-xs text-zinc-500 font-mono mt-0.5">{p.phone ?? "—"}</p>
											{p.subtitle && (
												<p className="text-xs text-zinc-500 mt-0.5 truncate">{p.subtitle}</p>
											)}
										</div>
									</div>
									<Button
										type="button"
										size="icon"
										className="shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10"
										disabled={!p.phone}
										onClick={() => handleSendOne(p)}
										aria-label="Send WhatsApp"
									>
										<Send className="h-4 w-4 text-white" />
									</Button>
								</CardContent>
							</Card>
						);
					})
				)}
			</div>

			<BulkSendModal open={bulkOpen} onOpenChange={setBulkOpen} queue={queueForBulk} />
		</div>
	);
}
