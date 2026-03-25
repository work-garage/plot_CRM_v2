import { Skeleton } from "@/components/ui";

export default function SalesLoading() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-9 w-28" />
			</div>
			<Skeleton className="h-12 w-full rounded-lg" />
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-36 w-full rounded-lg" />
				))}
			</div>
		</div>
	);
}
