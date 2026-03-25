import { Card, CardContent, CardHeader } from "@/components/ui";
import { Skeleton } from "@/components/ui";

export function ReportsSkeleton() {
	return (
		<div className="space-y-6 animate-pulse">
			{/* Filter bar */}
			<div className="flex flex-wrap gap-3 items-center">
				<Skeleton className="h-9 w-32" />
				<Skeleton className="h-9 w-32" />
				<Skeleton className="h-9 w-24" />
				<Skeleton className="h-9 w-24" />
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-28" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-32" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Two column grids */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-5 w-48" />
						</CardHeader>
						<CardContent className="space-y-4">
							{Array.from({ length: 4 }).map((_, j) => (
								<div key={j} className="flex justify-between">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-20" />
								</div>
							))}
						</CardContent>
					</Card>
				))}
			</div>

			{/* Table skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-56" />
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="flex gap-4">
								<Skeleton className="h-4 flex-1" />
								<Skeleton className="h-4 flex-1" />
								<Skeleton className="h-4 w-20" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
