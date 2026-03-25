"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { HrAttendanceUpload, type HrAttendanceUploadResult } from "@/components/hr/hr-attendance-upload";
import { formatAttendanceSaveBannerSubline } from "@/lib/hr/attendance-save-messages";
import {
	HrAttendanceRecordsView,
	mapDbRowsToAttendanceVM,
} from "@/components/hr/hr-attendance-records-view";
import { HrAttendanceDeleteModal } from "@/components/hr/hr-attendance-delete-modal";
import type { HrEmployeeRow } from "@/app/actions/hr";

export function HrAttendanceClient({
	initialRows,
	employees,
}: {
	initialRows: any[];
	employees: HrEmployeeRow[];
}) {
	const [lastImport, setLastImport] = useState<
		Pick<HrAttendanceUploadResult, "inserted" | "parsed" | "errors" | "attendanceCreated" | "attendanceUpdated"> | null
	>(null);

	const vm = useMemo(() => mapDbRowsToAttendanceVM(initialRows), [initialRows]);

	return (
		<div className="mx-auto w-full max-w-full min-w-0 space-y-8 px-4 md:px-0">
			{/* Full-width header (stacked) — avoids a squeezed title beside actions looking like a vertical “column” */}
			<header className="w-full min-w-0 space-y-4 border-b border-border/70 pb-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
					<p className="text-sm text-muted-foreground">
						Upload Work Duration reports and review saved rows below.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button asChild variant="ghost" size="sm">
						<Link href="/hr">Back</Link>
					</Button>
					<HrAttendanceDeleteModal employees={employees} />
					<HrAttendanceUpload
						onComplete={(r) => {
							setLastImport({
								inserted: r.inserted,
								parsed: r.parsed,
								errors: r.errors,
								attendanceCreated: r.attendanceCreated,
								attendanceUpdated: r.attendanceUpdated,
							});
						}}
					/>
				</div>
			</header>

			{lastImport && (
				<Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
					<CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
						<Badge className="bg-emerald-600">Saved</Badge>
						<div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
							<span>
								Saved <strong>{lastImport.inserted}</strong> of {lastImport.parsed} parsed row
								{lastImport.parsed === 1 ? "" : "s"}
							</span>
							{lastImport.inserted > 0 ? (
								<span className="text-muted-foreground text-xs sm:text-sm">
									{formatAttendanceSaveBannerSubline(lastImport)}
								</span>
							) : null}
						</div>
						{lastImport.errors.length > 0 && (
							<span className="text-amber-800 dark:text-amber-200">
								· {lastImport.errors.length} message(s) — check upload panel if you re-import
							</span>
						)}
					</CardContent>
				</Card>
			)}

			<HrAttendanceRecordsView records={vm} title="Saved attendance" showFilters />
		</div>
	);
}
