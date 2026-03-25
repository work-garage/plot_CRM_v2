"use client";

import { useRouter } from "next/navigation";
import {
	MapPin,
	LayoutGrid,
	IndianRupee,
	ArrowRight,
	Pencil,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
	Button,
	Badge,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import type { PlotStatusCounts } from "@/app/actions/project-actions";

interface ProjectCardProps {
	id: string;
	name: string;
	location: string | null;
	total_plots_count: number;
	layout_expense: number | null;
	plotCounts: PlotStatusCounts;
}

const statusConfig = {
	available: {
		label: "Available",
		className: "bg-green-100 text-green-800 hover:bg-green-100",
	},
	token: {
		label: "Token",
		className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
	},
	agreement: {
		label: "Agreement",
		className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
	},
	sold: {
		label: "Sold",
		className: "bg-red-100 text-red-800 hover:bg-red-100",
	},
};

export function ProjectCard({
	id,
	name,
	location,
	total_plots_count,
	layout_expense,
	plotCounts,
}: ProjectCardProps) {
	const router = useRouter();

	return (
		<div
			onClick={() => router.push(`/projects/${id}`)}
			className="block h-full cursor-pointer group"
		>
			<Card className="flex flex-col h-full group-hover:border-zinc-400 transition-colors">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="space-y-1 min-w-0">
							<CardTitle className="text-lg truncate">{name}</CardTitle>
							{location && (
								<div className="flex items-center gap-1 text-sm text-zinc-500">
									<MapPin className="h-3.5 w-3.5 shrink-0" />
									<span className="truncate">{location}</span>
								</div>
							)}
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0"
							onClick={(e) => {
								e.stopPropagation();
								router.push(`/projects/${id}?edit=true`);
							}}
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
					</div>
				</CardHeader>

				<CardContent className="flex-1 space-y-4">
					{/* Counts row */}
					<div className="flex items-center gap-2 text-sm text-zinc-600">
						<LayoutGrid className="h-4 w-4 shrink-0" />
						<span>{total_plots_count} total plots</span>
					</div>

					{/* Status badges */}
					<div className="flex flex-wrap gap-1.5">
						{(
							Object.keys(statusConfig) as Array<keyof typeof statusConfig>
						).map((status) => {
							const count = plotCounts[status];
							if (count === 0) return null;
							const config = statusConfig[status];
							return (
								<Badge
									key={status}
									variant="secondary"
									className={config.className}
								>
									{config.label}: {count}
								</Badge>
							);
						})}
						{plotCounts.total === 0 && (
							<span className="text-xs text-zinc-400">No plots added yet</span>
						)}
					</div>

					{/* Layout expense */}
					{layout_expense && layout_expense > 0 ? (
						<div className="flex items-center gap-2 text-sm text-zinc-600">
							<IndianRupee className="h-4 w-4 shrink-0" />
							<span>Layout Expense: {formatCurrency(layout_expense)}</span>
						</div>
					) : null}
				</CardContent>

				<CardFooter className="pt-0 gap-2">
					<Button
						variant="default"
						size="sm"
						className="flex-1"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/projects/${id}/plots`);
						}}
					>
						View Plots
						<ArrowRight className="h-4 w-4 ml-2" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/projects/${id}`);
						}}
					>
						Details
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
