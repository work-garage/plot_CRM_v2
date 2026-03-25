"use client";

import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Card,
	CardContent,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import type { HrEmployeeRow } from "@/app/actions/hr";
import { HrEmployeeDialog } from "@/components/hr/hr-employee-dialog";

export function HrEmployeesTable({ employees }: { employees: HrEmployeeRow[] }) {
	const [editTarget, setEditTarget] = useState<HrEmployeeRow | null>(null);
	const [editOpen, setEditOpen] = useState(false);

	if (!employees.length) {
		return (
			<p className="text-sm text-zinc-500 border border-dashed rounded-lg p-8 text-center">
				No employees yet. Create one or run the HR database migration.
			</p>
		);
	}
	return (
		<>
			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Code</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Type</TableHead>
								<TableHead className="text-right">Salary</TableHead>
								<TableHead className="text-right">OT rate</TableHead>
								<TableHead className="text-right">Req hrs/wk</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{employees.map((e) => (
								<TableRow
									key={e.id}
									className="cursor-pointer hover:bg-muted/50"
									onClick={() => {
										setEditTarget(e);
										setEditOpen(true);
									}}
								>
									<TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
									<TableCell className="font-medium">{e.name}</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{e.phone ?? "—"}
									</TableCell>
									<TableCell className="capitalize">{e.salary_type}</TableCell>
									<TableCell className="text-right">{formatCurrency(Number(e.salary_rate))}</TableCell>
									<TableCell className="text-right">{formatCurrency(Number(e.overtime_rate))}</TableCell>
									<TableCell className="text-right">{e.required_hours_per_week}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			{editTarget && (
				<HrEmployeeDialog
					variant="edit"
					employee={editTarget}
					open={editOpen}
					onOpenChange={(o) => {
						setEditOpen(o);
						if (!o) setEditTarget(null);
					}}
				/>
			)}
		</>
	);
}
