import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui";

export default function HrAttendanceLoading() {
	return (
		<div className="space-y-8">
			<PageHeader title="Attendance" subtitle="Loading…" />
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-24 rounded-lg" />
				))}
			</div>
			<Skeleton className="h-10 w-full max-w-md rounded-md" />
			<Skeleton className="h-[420px] w-full rounded-lg" />
		</div>
	);
}
