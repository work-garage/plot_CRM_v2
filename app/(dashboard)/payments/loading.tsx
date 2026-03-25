import { Skeleton } from "@/components/ui";

export default function PaymentsLoading() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-40" />
					<Skeleton className="h-4 w-56" />
				</div>
				<Skeleton className="h-9 w-48" />
			</div>
			<Skeleton className="h-24 w-full rounded-lg" />
			<Skeleton className="h-64 w-full rounded-lg" />
		</div>
	);
}
