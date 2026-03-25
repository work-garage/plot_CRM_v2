import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui";
import { listHrEmployees } from "@/app/actions/hr";
import { HrEmployeeDialog } from "@/components/hr/hr-employee-dialog";
import { HrEmployeesTable } from "@/components/hr/hr-employees-table";

export default async function HrEmployeesPage() {
	const employees = await listHrEmployees();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Employees"
				subtitle="HR employee master (codes used in attendance upload)"
				action={
					<div className="flex gap-2">
						<Button asChild variant="ghost" size="sm">
							<Link href="/hr">Back</Link>
						</Button>
						<HrEmployeeDialog />
					</div>
				}
			/>
			<HrEmployeesTable employees={employees} />
		</div>
	);
}
