"use client";

import { useRouter } from "next/navigation";
import { Phone, MapPin, Pencil } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Button,
	Badge,
} from "@/components/ui";

interface AdvisorCardProps {
	advisor: any;
}

export function AdvisorCard({ advisor }: AdvisorCardProps) {
	const router = useRouter();

	return (
		<div
			onClick={() => router.push(`/advisors/${advisor.id}`)}
			className="block h-full cursor-pointer group"
		>
			<Card className="overflow-hidden h-full group-hover:border-zinc-400 transition-colors">
				<CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
							{advisor.name.charAt(0)}
						</div>
						<div>
							<CardTitle className="text-base">{advisor.name}</CardTitle>
							<p className="text-xs text-zinc-500 font-mono">{advisor.code}</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/advisors/${advisor.id}/edit`);
						}}
					>
						<Pencil className="h-4 w-4" />
					</Button>
				</CardHeader>
				<CardContent className="p-4 pt-2 space-y-3">
					<div className="flex items-center gap-2 text-sm text-zinc-600">
						<Phone className="h-3.5 w-3.5" />
						<span>{advisor.phone}</span>
					</div>
					{advisor.address && (
						<div className="flex items-center gap-2 text-sm text-zinc-600">
							<MapPin className="h-3.5 w-3.5" />
							<span className="truncate">{advisor.address}</span>
						</div>
					)}
					<div className="pt-2 border-t flex items-center justify-between">
						<div className="text-xs font-semibold text-zinc-500">
							PROJECT-WISE COMMISSION
						</div>
						<Badge variant="secondary" className="bg-zinc-100">
							Manage in Project
						</Badge>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
