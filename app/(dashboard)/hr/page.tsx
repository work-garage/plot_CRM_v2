import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { Users, CalendarClock, Wallet } from "lucide-react";

export default function HrHubPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="HR & Attendance"
				subtitle="Employees, attendance uploads, and payroll payouts (admin)"
			/>
			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base flex items-center gap-2">
							<Users className="h-5 w-5" /> Employees
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-zinc-600 mb-3">Manage staff codes and salary settings.</p>
						<Button asChild size="sm" variant="outline">
							<Link href="/hr/employees">Open</Link>
						</Button>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base flex items-center gap-2">
							<CalendarClock className="h-5 w-5" /> Attendance
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-zinc-600 mb-3">Upload Excel / view records.</p>
						<Button asChild size="sm" variant="outline">
							<Link href="/hr/attendance">Open</Link>
						</Button>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base flex items-center gap-2">
							<Wallet className="h-5 w-5" /> Payouts
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-zinc-600 mb-3">Generate monthly payouts and record payments.</p>
						<Button asChild size="sm" variant="outline">
							<Link href="/hr/payouts">Open</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
