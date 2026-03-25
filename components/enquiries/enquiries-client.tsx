"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	Badge,
	Button,
	Card,
	CardContent,
	Input,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import type { EnquiryRow } from "@/app/actions/enquiries";
import { EnquiryCreateModal } from "@/components/enquiries/enquiry-create-modal";
import { EnquiryEditModal } from "@/components/enquiries/enquiry-edit-modal";
import { Calendar, Building2, User, PhoneCall, Trophy, XCircle, Activity, CheckSquare, TrendingUp, GitBranch } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = "active" | "tasks" | "won" | "lost";

const LEAD_STATUS_COLOR: Record<string, string> = {
	"New Lead": "bg-blue-50 text-blue-700 border-blue-200",
	"Contacted": "bg-sky-50 text-sky-700 border-sky-200",
	"Follow-up": "bg-yellow-50 text-yellow-700 border-yellow-200",
	"Site Visit Scheduled": "bg-orange-50 text-orange-700 border-orange-200",
	"Site Visit Done": "bg-purple-50 text-purple-700 border-purple-200",
	"Negotiation": "bg-pink-50 text-pink-700 border-pink-200",
	"Closed Won": "bg-green-50 text-green-700 border-green-200",
	"Closed Lost": "bg-red-50 text-red-700 border-red-200",
};

export function EnquiriesClient({
	initialEnquiries,
	projects,
	advisors = [],
}: {
	initialEnquiries: EnquiryRow[];
	projects: Array<{ id: string; name: string }>;
	advisors?: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryTab = searchParams.get("tab") as Tab;
	const activeTab = ["active", "tasks", "won", "lost"].includes(queryTab) ? queryTab : "active";

	const setActiveTab = (t: Tab) => {
		const current = new URLSearchParams(Array.from(searchParams.entries()));
		current.set("tab", t);
		router.push(`?${current.toString()}`);
	};

	const [query, setQuery] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [editEnquiry, setEditEnquiry] = useState<EnquiryRow | null>(null);

	const activeLeads = initialEnquiries.filter(e => e.lead_status !== "Closed Won" && e.lead_status !== "Closed Lost");
	const tabCounts = useMemo(() => ({
		active: activeLeads.length,
		tasks: activeLeads.length,
		won: initialEnquiries.filter(e => e.lead_status === "Closed Won").length,
		lost: initialEnquiries.filter(e => e.lead_status === "Closed Lost").length,
	}), [initialEnquiries, activeLeads]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return initialEnquiries.filter((e) => {
			// Tab filter
			if (["active", "tasks"].includes(activeTab) && (e.lead_status === "Closed Won" || e.lead_status === "Closed Lost")) return false;
			if (activeTab === "won" && e.lead_status !== "Closed Won") return false;
			if (activeTab === "lost" && e.lead_status !== "Closed Lost") return false;

			if (!q) return true;
			const hay = `${e.name} ${e.phone} ${e.city ?? ""} ${e.email ?? ""} ${e.property_type ?? ""} ${e.project_name ?? ""} ${e.lead_source ?? ""} ${e.advisor_name ?? ""}`.toLowerCase();
			return hay.includes(q);
		});
	}, [initialEnquiries, query, activeTab]);

	const tabs: { id: Tab; label: string; icon: any; count: number; color: string }[] = [
		{ id: "active", label: "Active Leads", icon: GitBranch, count: tabCounts.active, color: "text-blue-600 border-blue-500" },
		{ id: "tasks", label: "Task Completion", icon: CheckSquare, count: tabCounts.tasks, color: "text-orange-600 border-orange-500" },
		{ id: "won", label: "Closed Won", icon: Trophy, count: tabCounts.won, color: "text-green-600 border-green-500" },
		{ id: "lost", label: "Closed Lost", icon: XCircle, count: tabCounts.lost, color: "text-red-600 border-red-500" },
	];

	return (
		<div className="space-y-5">
			<PageHeader
				title="Enquiries"
				subtitle={`${initialEnquiries.length} total leads`}
				action={
					<div className="flex gap-2">
						<Button size="sm" variant="outline" onClick={() => { toast.success("Refreshing..."); router.refresh(); }}>
							Refresh
						</Button>
						<Button size="sm" onClick={() => setCreateOpen(true)}>
							+ New Enquiry
						</Button>
					</div>
				}
			/>

			{/* Tabs */}
			<div className="flex flex-wrap gap-2 pb-4">
				{tabs.map((t) => (
					<button
						key={t.id}
						onClick={() => setActiveTab(t.id)}
						className={cn(
							"flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all border",
							activeTab === t.id
								? "bg-primary/5 border-primary/20 text-primary shadow-[0_2px_8px_-3px_rgba(6,81,237,0.15)]"
								: "bg-card border-border text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
						)}
					>
						<t.icon className="h-4 w-4" />
						{t.label}
						<span className={cn(
							"ml-1.5 rounded-full px-2 py-0.5 text-xs font-bold",
							activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
						)}>
							{t.count}
						</span>
					</button>
				))}
			</div>

			{/* Search */}
			<div className="flex gap-2 items-center">
				<Input
					value={query}
					placeholder="Search by name, phone, city, property type, advisor..."
					onChange={(e) => setQuery(e.target.value)}
					className="max-w-sm"
				/>
			</div>

			{activeTab === "lost" && (
				<div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
					<XCircle className="h-4 w-4" />
					These leads were marked as lost. Their data is preserved for future reference and re-engagement.
				</div>
			)}
			{activeTab === "won" && (
				<div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-2 text-sm text-green-700">
					<Trophy className="h-4 w-4" />
					These leads converted. They are also visible in the Customers section with full purchase details.
				</div>
			)}

			<Card>
				<CardContent className="p-0 overflow-x-auto">
					{(() => {
						if (activeTab === "tasks") {
							const completed = filtered.filter((e) => e.task_status === "Completed");
							const pending = filtered.filter((e) => e.task_status !== "Completed");

							return (
								<div className="flex flex-col">
									{pending.length > 0 && (
										<div>
											<div className="bg-orange-50 px-4 py-2 border-b border-orange-100 font-semibold text-orange-800 flex items-center gap-2">
												⚠️ Pending Tasks ({pending.length})
											</div>
											<EnquiryTableRows enquiries={pending} onEdit={setEditEnquiry} query={query} tab={activeTab} />
										</div>
									)}
									{completed.length > 0 && (
										<div>
											<div className="bg-green-50 px-4 py-2 border-y border-green-100 font-semibold text-green-800 flex items-center gap-2">
												✅ Completed Tasks ({completed.length})
											</div>
											<EnquiryTableRows enquiries={completed} onEdit={setEditEnquiry} query={query} tab={activeTab} />
										</div>
									)}
									{pending.length === 0 && completed.length === 0 && (
										<EnquiryTableRows enquiries={[]} onEdit={setEditEnquiry} query={query} tab={activeTab} />
									)}
								</div>
							);
						}


						return <EnquiryTableRows enquiries={filtered} onEdit={setEditEnquiry} query={query} tab={activeTab} />;
					})()}
				</CardContent>
			</Card>

			<EnquiryCreateModal
				open={createOpen}
				onOpenChange={setCreateOpen}
				projects={projects}
				advisors={advisors}
			/>

			<EnquiryEditModal
				open={editEnquiry != null}
				onOpenChange={(o) => { if (!o) setEditEnquiry(null); }}
				enquiry={editEnquiry}
				projects={projects}
				advisors={advisors}
			/>
		</div>
	);
}

function EnquiryTableRows({ enquiries, onEdit, query, tab }: { enquiries: EnquiryRow[]; onEdit: (e: EnquiryRow) => void; query: string; tab: string }) {
	return (
		<Table>
			<TableHeader>
				<TableRow className="bg-zinc-50 border-t-0">
					<TableHead className="font-semibold">Customer</TableHead>
					<TableHead className="font-semibold">Requirements</TableHead>
					<TableHead className="font-semibold">Status</TableHead>
					<TableHead className="font-semibold">Budget</TableHead>
					<TableHead className="font-semibold">Advisor</TableHead>
					<TableHead className="font-semibold">Project</TableHead>
					<TableHead className="font-semibold">Date</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{enquiries.length === 0 ? (
					<TableRow>
						<TableCell colSpan={7} className="text-center text-zinc-500 py-12">
							{query ? "No results match your search." : tab === "active" ? "No active leads yet." : tab === "won" ? "No closed won leads yet." : tab === "lost" ? "No lost leads." : "No leads in this category."}
						</TableCell>
					</TableRow>
				) : (
					enquiries.map((enq) => (
						<TableRow
							key={enq.id}
							className="hover:bg-zinc-50 cursor-pointer border-t"
							onClick={() => onEdit(enq)}
						>
							<TableCell>
								<div className="min-w-[140px]">
									<div className="flex items-center gap-2">
										<User className="h-4 w-4 text-zinc-400 shrink-0" />
										<div className="font-semibold text-sm truncate">{enq.name}</div>
									</div>
									<div className="text-xs text-zinc-500 font-mono mt-0.5">{enq.phone}</div>
									{enq.city && <div className="text-xs text-zinc-400 mt-0.5">{enq.city}</div>}
									{enq.email && <div className="text-xs text-zinc-400 truncate max-w-[160px]">{enq.email}</div>}
								</div>
							</TableCell>
							<TableCell>
								<div className="flex flex-col gap-1 min-w-[150px]">
									<div className="flex items-center gap-1.5 flex-wrap">
										{enq.property_type && <Badge variant="secondary" className="text-xs">{enq.property_type}</Badge>}
										{enq.segment && <Badge variant="outline" className="text-xs">{enq.segment}</Badge>}
									</div>
									<div className="text-xs text-zinc-500">
										{enq.bhk_size ? `${enq.bhk_size}` : ""}
										{enq.preferred_location ? ` · ${enq.preferred_location}` : ""}
									</div>
									{enq.lead_source && <div className="text-[11px] text-zinc-400">via {enq.lead_source}</div>}
								</div>
							</TableCell>
							<TableCell>
								<div className={cn(
									"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
									LEAD_STATUS_COLOR[enq.lead_status] || "bg-zinc-50 text-zinc-600 border-zinc-200"
								)}>
									{enq.lead_status || "New Lead"}
								</div>
								{tab === "tasks" && (
									<div className={cn(
										"inline-flex ml-2 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
										enq.task_status === "Completed" ? "bg-green-50 text-green-700 border-green-200" : "bg-orange-50 text-orange-700 border-orange-200"
									)}>
										{enq.task_status}
									</div>
								)}
							</TableCell>
							<TableCell className="text-sm text-zinc-700 whitespace-nowrap">
								{enq.budget_min || enq.budget_max
									? `₹${((enq.budget_min || 0) / 100000).toFixed(1)}L – ₹${((enq.budget_max || 0) / 100000).toFixed(1)}L`
									: "—"}
							</TableCell>
							<TableCell>
								<div className="text-sm text-zinc-700 min-w-[100px]">
									{enq.advisor_name || "—"}
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
									<span className="text-sm text-zinc-700 truncate max-w-[140px]">
										{enq.project_name ?? "—"}
									</span>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-1 text-xs text-zinc-500">
									<Calendar className="h-3.5 w-3.5 text-zinc-400" />
									{String(enq.created_at).slice(0, 10)}
								</div>
							</TableCell>
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);
}
