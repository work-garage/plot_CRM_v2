"use client";

import { useRouter } from "next/navigation";
import {
	LayoutGrid,
	MapPin,
	IndianRupee,
	CheckCircle,
	Clock,
	FileText,
	ShieldCheck,
	Pencil,
	Trash2,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Button,
	Badge,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";

const statusConfig = {
	available: {
		label: "Available",
		icon: CheckCircle,
		className: "bg-green-50 text-green-700 border-green-200",
	},
	token: {
		label: "Token",
		icon: Clock,
		className: "bg-yellow-50 text-yellow-700 border-yellow-200",
	},
	agreement: {
		label: "Agreement",
		icon: FileText,
		className: "bg-blue-50 text-blue-700 border-blue-200",
	},
	sold: {
		label: "Sold",
		icon: ShieldCheck,
		className: "bg-red-50 text-red-700 border-red-200",
	},
};

interface PlotCardProps {
	plot: {
		id: string;
		plot_number: string;
		size_sqft: number;
		rate_per_sqft: number;
		status: string;
		facing: string | null;
	};
	projectId: string;
}

export function PlotCard({ plot, projectId }: PlotCardProps) {
	const router = useRouter();
	const status = (plot.status || "available") as keyof typeof statusConfig;
	const config = statusConfig[status];
	const StatusIcon = config.icon;
	const totalAmount = plot.size_sqft * plot.rate_per_sqft;

	return (
		<div
			onClick={() =>
				router.push(`/projects/${projectId}/plots?plotId=${plot.id}`)
			}
			className="block h-full cursor-pointer group"
		>
			<Card className="h-full overflow-hidden transition-colors border-zinc-200 group-hover:border-zinc-400">
				<CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
					<div className="flex items-center gap-2">
						<Badge
							variant="outline"
							className={`${config.className} font-medium px-2 py-0.5`}
						>
							<StatusIcon className="w-3 h-3 mr-1" />
							{config.label}
						</Badge>
						<span className="text-lg font-bold text-zinc-900">
							{plot.plot_number}
						</span>
					</div>
				</CardHeader>
				<CardContent className="p-4 pt-2 space-y-3">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-0.5">
							<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
								Size
							</p>
							<p className="text-sm font-semibold text-zinc-700">
								{plot.size_sqft} sqft
							</p>
						</div>
						<div className="space-y-0.5 text-right">
							<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
								Facing
							</p>
							<p className="text-sm font-semibold text-zinc-700">
								{plot.facing || "—"}
							</p>
						</div>
						<div className="space-y-0.5">
							<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
								Rate
							</p>
							<p className="text-sm font-semibold text-zinc-700">
								{formatCurrency(plot.rate_per_sqft)}/sqft
							</p>
						</div>
						<div className="space-y-0.5 text-right">
							<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
								Total Value
							</p>
							<p className="text-sm font-bold text-zinc-900">
								{formatCurrency(totalAmount)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
