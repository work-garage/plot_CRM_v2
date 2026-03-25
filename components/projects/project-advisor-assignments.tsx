"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, X, Save } from "lucide-react";
import {
	Button,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import type { AdvisorProjectAssignment } from "@/app/actions/advisor-projects";
import {
	removeAdvisorAssignment,
	upsertAdvisorAssignment,
} from "@/app/actions/advisor-projects";
import { formatCurrencyShort } from "@/lib/utils/formatters";

type Advisor = { id: string; name: string; code: string; phone: string };

export function ProjectAdvisorAssignments({
	projectId,
	advisors,
	assignments,
}: {
	projectId: string;
	advisors: Advisor[];
	assignments: AdvisorProjectAssignment[];
}) {
	const MAX_RATE = 9_999_999_999.99;
	const [saving, setSaving] = useState(false);
	const [advisorId, setAdvisorId] = useState<string>("");
	const [commissionRate, setCommissionRate] = useState<number>(0);
	const [editAdvisorId, setEditAdvisorId] = useState<string>("");
	const [editCommissionRate, setEditCommissionRate] = useState<number>(0);

	const assignedAdvisorIds = useMemo(
		() => new Set(assignments.map((a) => a.advisor_id)),
		[assignments],
	);

	const availableAdvisors = useMemo(
		() => advisors.filter((a) => !assignedAdvisorIds.has(a.id)),
		[advisors, assignedAdvisorIds],
	);

	async function onAdd() {
		if (!advisorId) {
			toast.error("Select an advisor");
			return;
		}
		if (!Number.isFinite(commissionRate) || commissionRate < 0) {
			toast.error("Invalid rate", {
				description: `Commission rate must be a valid positive number`,
			});
			return;
		}
		if (commissionRate > MAX_RATE) {
			toast.error("Rate too large", {
				description: `Commission rate max allowed is ₹ ${MAX_RATE.toLocaleString("en-IN")}/sqft`,
			});
			return;
		}
		setSaving(true);
		try {
			const res = await upsertAdvisorAssignment(projectId, {
				advisor_id: advisorId,
				commission_rate: commissionRate,
			});
			if (!res.success) {
				toast.error("Failed to assign", { description: res.error });
				return;
			}
			toast.success("Advisor assigned to project");
			setAdvisorId("");
			setCommissionRate(0);
		} finally {
			setSaving(false);
		}
	}

	async function onRemove(aid: string) {
		setSaving(true);
		try {
			const res = await removeAdvisorAssignment(projectId, aid);
			if (!res.success) {
				toast.error("Failed to remove", { description: res.error });
				return;
			}
			toast.success("Advisor removed from project");
		} finally {
			setSaving(false);
		}
	}

	function onStartEdit(a: AdvisorProjectAssignment) {
		setEditAdvisorId(a.advisor_id);
		setEditCommissionRate(Number((a as any).commission_rate ?? 0));
	}

	function onCancelEdit() {
		setEditAdvisorId("");
		setEditCommissionRate(0);
	}

	async function onSaveEdit() {
		if (!editAdvisorId) return;
		if (!Number.isFinite(editCommissionRate) || editCommissionRate < 0) {
			toast.error("Invalid rate", {
				description: `Commission rate must be a valid positive number`,
			});
			return;
		}
		if (editCommissionRate > MAX_RATE) {
			toast.error("Rate too large", {
				description: `Commission rate max allowed is ₹ ${MAX_RATE.toLocaleString("en-IN")}/sqft`,
			});
			return;
		}
		setSaving(true);
		try {
			const res = await upsertAdvisorAssignment(projectId, {
				advisor_id: editAdvisorId,
				commission_rate: editCommissionRate,
			});
			if (!res.success) {
				toast.error("Failed to update", { description: res.error });
				return;
			}
			toast.success("Rates updated");
			onCancelEdit();
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
				<div className="lg:col-span-2">
					<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
						Advisor
					</label>
					<Select value={advisorId} onValueChange={setAdvisorId}>
						<SelectTrigger className="mt-1">
							<SelectValue placeholder="Select advisor to assign" />
						</SelectTrigger>
						<SelectContent>
							{availableAdvisors.map((a) => (
								<SelectItem key={a.id} value={a.id}>
									{a.name} ({a.code})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-[11px] text-zinc-500 mt-1">
						Assign a single commission rate for this advisor in this project.
					</p>
				</div>

				<RateInput
					label="Commission Rate (₹/sqft)"
					value={commissionRate}
					onChange={setCommissionRate}
				/>
				<div className="lg:col-span-5 flex justify-end">
					<Button onClick={onAdd} disabled={saving || !advisorId} size="sm">
						<Plus className="h-4 w-4 mr-2" />
						Assign Advisor
					</Button>
				</div>
			</div>

			<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Advisor</TableHead>
						<TableHead className="text-right">
							Commission (₹/sqft)
						</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{assignments.length === 0 ? (
						<TableRow>
							<TableCell colSpan={3} className="text-sm text-zinc-500">
								No advisors assigned yet.
							</TableCell>
						</TableRow>
					) : (
						assignments.map((a) => (
							editAdvisorId === a.advisor_id ? (
								<TableRow key={a.id}>
									<TableCell className="font-medium">
										{a.advisor?.name ?? a.advisor_id}
										{a.advisor?.code ? (
											<span className="ml-2 text-xs text-zinc-500">
												({a.advisor.code})
											</span>
										) : null}
									</TableCell>
									<TableCell className="text-right">
										<InlineRateInput
											value={editCommissionRate}
											onChange={setEditCommissionRate}
										/>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											<Button
												variant="ghost"
												size="icon"
												disabled={saving}
												onClick={onSaveEdit}
												title="Save"
											>
												<Save className="h-4 w-4 text-zinc-700" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												disabled={saving}
												onClick={onCancelEdit}
												title="Cancel"
											>
												<X className="h-4 w-4 text-zinc-500" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							) : (
							<TableRow key={a.id}>
								<TableCell className="font-medium">
									{a.advisor?.name ?? a.advisor_id}
									{a.advisor?.code ? (
										<span className="ml-2 text-xs text-zinc-500">
											({a.advisor.code})
										</span>
									) : null}
								</TableCell>
								<TableCell className="text-right">
									{formatCurrencyShort(
										Number((a as any).commission_rate ?? 0)
									)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Button
											variant="ghost"
											size="icon"
											disabled={saving || !!editAdvisorId}
											onClick={() => onStartEdit(a)}
											title="Edit"
										>
											<Pencil className="h-4 w-4 text-zinc-500" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											disabled={saving || !!editAdvisorId}
											onClick={() => onRemove(a.advisor_id)}
											title="Remove"
										>
											<Trash2 className="h-4 w-4 text-zinc-500" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
							)
						))
					)}
				</TableBody>
			</Table>
			</div>
		</div>
	);
}

function RateInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<div>
			<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
				{label}
			</label>
			<Input
				className="mt-1"
				type="number"
				min={0}
				max={9_999_999_999.99}
				step={0.5}
				value={value || ""}
				onChange={(e) => {
					const raw = e.target.value;
					const sanitized = raw.replace(/^0+(?=\d)/, "");
					onChange(sanitized === "" ? 0 : Number(sanitized) || 0);
				}}
			/>
		</div>
	);
}

function InlineRateInput({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<Input
			className="h-8 w-[110px] ml-auto text-right"
			type="number"
			min={0}
			max={9_999_999_999.99}
			step={0.5}
			value={value || ""}
			onChange={(e) => {
				const raw = e.target.value;
				const sanitized = raw.replace(/^0+(?=\d)/, "");
				onChange(sanitized === "" ? 0 : Number(sanitized) || 0);
			}}
		/>
	);
}

