"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
	previewHrAttendanceDelete,
	deleteHrAttendanceChunk,
	revalidateHrAttendancePage,
	type HrEmployeeRow,
} from "@/app/actions/hr";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Progress,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";

type Props = {
	employees: HrEmployeeRow[];
};

export function HrAttendanceDeleteModal({ employees }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [employeeId, setEmployeeId] = useState<string>("all");

	const [previewCount, setPreviewCount] = useState<number | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [statusLine, setStatusLine] = useState("");

	const resetTransient = useCallback(() => {
		setPreviewCount(null);
		setPreviewLoading(false);
		setDeleteLoading(false);
		setProgress(0);
		setStatusLine("");
	}, []);

	useEffect(() => {
		if (!open) {
			resetTransient();
		}
	}, [open, resetTransient]);

	const employeeFilter = employeeId === "all" ? null : employeeId;

	const runPreview = async () => {
		setPreviewLoading(true);
		setPreviewCount(null);
		setStatusLine("Counting matching rows…");
		try {
			const result = await previewHrAttendanceDelete({
				from: from.trim(),
				to: to.trim(),
				employeeId: employeeFilter,
			});
			if (!result.ok) {
				toast.error(result.error);
				setStatusLine("");
				return;
			}
			setPreviewCount(result.count);
			setStatusLine(
				result.count === 0
					? "No rows match this range and employee filter."
					: `Ready to delete ${result.count} row${result.count === 1 ? "" : "s"}.`
			);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Preview failed");
			setStatusLine("");
		} finally {
			setPreviewLoading(false);
		}
	};

	const runDelete = async () => {
		if (!from.trim() || !to.trim()) {
			toast.error("Choose From and To dates.");
			return;
		}

		setDeleteLoading(true);
		setProgress(0);
		setStatusLine("Preparing delete…");

		let expected = previewCount;
		if (expected == null) {
			setStatusLine("Verifying row count…");
			const again = await previewHrAttendanceDelete({
				from: from.trim(),
				to: to.trim(),
				employeeId: employeeFilter,
			});
			if (!again.ok) {
				toast.error(again.error);
				setDeleteLoading(false);
				setStatusLine("");
				return;
			}
			expected = again.count;
			setPreviewCount(again.count);
		}

		if (expected === 0) {
			toast.message("Nothing to delete.");
			setDeleteLoading(false);
			setStatusLine("");
			return;
		}

		let totalDeleted = 0;
		let failed = false;
		try {
			while (true) {
				setStatusLine(`Deleting… (${totalDeleted} removed so far)`);
				const chunk = await deleteHrAttendanceChunk({
					from: from.trim(),
					to: to.trim(),
					employeeId: employeeFilter,
				});
				if (!chunk.ok) {
					toast.error(chunk.error);
					failed = true;
					break;
				}
				if (chunk.deletedInBatch === 0) break;
				totalDeleted += chunk.deletedInBatch;
				const pct =
					expected > 0 ? Math.min(100, Math.round((totalDeleted / expected) * 100)) : Math.min(100, totalDeleted);
				setProgress(pct);
			}

			if (!failed) {
				setProgress(100);
			}
			setStatusLine("Refreshing list…");
			const rev = await revalidateHrAttendancePage();
			if (!rev.ok) {
				toast.error(rev.error ?? "Could not refresh cache");
			}
			await router.refresh();

			if (!failed && totalDeleted > 0) {
				toast.success(`Deleted ${totalDeleted} attendance row${totalDeleted === 1 ? "" : "s"}.`);
				setOpen(false);
			} else if (!failed && totalDeleted === 0) {
				toast.message("No rows were removed.");
			} else if (failed && totalDeleted > 0) {
				toast.warning(`Removed ${totalDeleted} row(s) before an error stopped the job. Refresh and check.`);
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Delete failed");
			try {
				await revalidateHrAttendancePage();
			} catch {
				/* ignore */
			}
			router.refresh();
		} finally {
			setDeleteLoading(false);
			setStatusLine("");
			setProgress(0);
		}
	};

	const busy = previewLoading || deleteLoading;
	const fromT = from.trim();
	const toT = to.trim();
	const rangeOk = Boolean(fromT && toT && fromT <= toT);
	const canPreview = rangeOk && !busy;
	const canDelete = rangeOk && previewCount !== null && previewCount > 0 && !deleteLoading;

	const sortedEmployees = [...employees].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="destructive" size="sm" className="gap-1.5">
					<Trash2 className="h-3.5 w-3.5" />
					Delete attendance
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Delete attendance by date range</DialogTitle>
					<DialogDescription>
						Removes saved rows in <code className="text-xs">hr_attendance</code> for the chosen period. Employees
						are not deleted. This cannot be undone — run a preview first.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<label htmlFor="hr-del-from" className="text-xs font-medium text-muted-foreground">
								From (inclusive)
							</label>
							<Input
								id="hr-del-from"
								type="date"
								value={from}
								disabled={busy}
								onChange={(e) => {
									setFrom(e.target.value);
									setPreviewCount(null);
								}}
							/>
						</div>
						<div className="space-y-1.5">
							<label htmlFor="hr-del-to" className="text-xs font-medium text-muted-foreground">
								To (inclusive)
							</label>
							<Input
								id="hr-del-to"
								type="date"
								value={to}
								disabled={busy}
								onChange={(e) => {
									setTo(e.target.value);
									setPreviewCount(null);
								}}
							/>
						</div>
					</div>
					<p className="text-[10px] text-muted-foreground">
						For a single day, set From and To to the same date.
					</p>

					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">Employee scope</label>
						<Select
							value={employeeId}
							disabled={busy}
							onValueChange={(v) => {
								setEmployeeId(v);
								setPreviewCount(null);
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="All employees" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All employees</SelectItem>
								{sortedEmployees.map((emp) => (
									<SelectItem key={emp.id} value={emp.id}>
										<span className="font-mono text-xs">#{emp.employee_code}</span> {emp.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{previewCount !== null && !deleteLoading ? (
						<p className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
							<strong>{previewCount}</strong> row{previewCount === 1 ? "" : "s"} will be permanently removed.
						</p>
					) : null}

					{previewLoading && (
						<div className="space-y-2">
							<div
								className="h-2 w-full animate-pulse rounded-full bg-primary/35"
								aria-busy
								aria-label="Loading"
							/>
							<p className="text-xs text-muted-foreground">{statusLine || "Working…"}</p>
						</div>
					)}
					{deleteLoading && (
						<div className="space-y-2">
							<Progress value={Math.min(100, Math.max(progress, 6))} className="h-2" />
							<p className="text-xs text-muted-foreground">{statusLine || "Deleting…"}</p>
							<p className="text-[10px] text-muted-foreground">
								Rows are removed in batches; progress tracks estimated completion.
							</p>
						</div>
					)}
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button type="button" variant="secondary" disabled={!canPreview} onClick={() => void runPreview()}>
						{previewLoading ? "Checking…" : "Check rows"}
					</Button>
					<Button type="button" variant="destructive" disabled={!canDelete} onClick={() => void runDelete()}>
						{deleteLoading ? "Deleting…" : "Delete permanently"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
