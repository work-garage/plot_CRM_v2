"use client";

import { useRouter } from "next/navigation";
import { User, Phone, MapPin, Pencil, UserCheck } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Button,
	Badge,
} from "@/components/ui";
import { formatDate } from "@/lib/utils/formatters";

interface CustomerCardProps {
	customer: any;
}

export function CustomerCard({ customer }: CustomerCardProps) {
	const router = useRouter();

	return (
		<div
			onClick={() => router.push(`/customers/${customer.id}`)}
			className="block h-full cursor-pointer group"
		>
			<Card className="overflow-hidden h-full group-hover:border-zinc-400 transition-colors">
				<CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
							{customer.name.charAt(0)}
						</div>
						<div>
							<CardTitle className="text-base">{customer.name}</CardTitle>
							{customer.route && (
								<p className="text-xs text-zinc-500">{customer.route}</p>
							)}
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/customers/${customer.id}/edit`);
						}}
					>
						<Pencil className="h-4 w-4" />
					</Button>
				</CardHeader>
				<CardContent className="p-4 pt-2 space-y-3">
					<div className="flex items-center gap-2 text-sm text-zinc-600">
						<Phone className="h-3.5 w-3.5" />
						<span>{customer.phone}</span>
					</div>

					<div className="pt-2 border-t flex items-center justify-between">
						<div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
							<UserCheck className="h-3.5 w-3.5" />
							<span>Advisor</span>
						</div>
						<span className="text-xs font-medium text-zinc-700">
							{customer.advisors?.name ?? "Not assigned"}
						</span>
					</div>

					<div className="pt-2 border-t flex items-center justify-between">
						<span className="text-xs font-medium text-zinc-500">Added by</span>
						<div className="text-right min-w-0">
							<span className="text-xs text-zinc-700 font-mono truncate ml-2 block">
								{customer.created_by_name || customer.created_by_email || "—"}
							</span>
							<span className="text-[11px] text-zinc-500 block">
								{formatDate(customer.created_by_at)}
							</span>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-zinc-500">Updated by</span>
						<div className="text-right min-w-0">
							<span className="text-xs text-zinc-700 font-mono truncate ml-2 block">
								{customer.last_edited_by_name || customer.last_edited_by_email || "—"}
							</span>
							<span className="text-[11px] text-zinc-500 block">
								{formatDate(customer.last_edited_by_at)}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
