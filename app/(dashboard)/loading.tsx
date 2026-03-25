import { Skeleton } from "@/components/ui";

export default function Loading() {
	return (
		<div className="space-y-6 animate-in fade-in duration-500 relative">
			{/* Navigation Progress Bar */}
			<div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden bg-zinc-100">
				<div className="h-full w-full bg-blue-600 origin-left animate-progress" />
			</div>

			{/* Page Header Skeleton */}
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>

			{/* Stats Cards Skeleton */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3 shadow-sm"
					>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-9 w-32" />
					</div>
				))}
			</div>

			{/* Main Content Skeleton */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
					<div className="flex items-center justify-between mb-6">
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-8 w-24" />
					</div>
					<div className="space-y-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0"
							>
								<div className="space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-24" />
								</div>
								<div className="space-y-1 text-right">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-3 w-16 ml-auto" />
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
					<Skeleton className="h-6 w-32 mb-6" />
					<div className="grid grid-cols-2 gap-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-24 w-full rounded-lg" />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
