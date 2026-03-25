import { Skeleton } from "@/components/ui";

export default function MessagingLoading() {
	return (
		<div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
			<div className="space-y-2">
				<Skeleton className="h-9 w-48" />
				<Skeleton className="h-4 w-96 max-w-full" />
			</div>
			<Skeleton className="h-40 w-full rounded-lg" />
			<Skeleton className="h-48 w-full rounded-lg" />
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-24 w-full rounded-lg" />
				))}
			</div>
		</div>
	);
}
