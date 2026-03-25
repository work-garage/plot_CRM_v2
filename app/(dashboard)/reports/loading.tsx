import { ReportsSkeleton } from "@/components/shared/reports-skeleton";

export default function ReportsLoading() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2">
				<div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
				<div className="h-4 w-72 bg-zinc-100 rounded animate-pulse" />
			</div>
			<ReportsSkeleton />
		</div>
	);
}
