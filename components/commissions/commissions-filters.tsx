"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Loader2 } from "lucide-react";

export function CommissionsFilters() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchParams = useSearchParams();
	const from = searchParams.get("from") ?? "";
	const to = searchParams.get("to") ?? "";
	const status = searchParams.get("status") ?? "all";
	
	const [customFrom, setCustomFrom] = useState(from);
	const [customTo, setCustomTo] = useState(to);
	const [selectedStatus, setSelectedStatus] = useState(status);

	useEffect(() => {
		setCustomFrom(from);
		setCustomTo(to);
		setSelectedStatus(status);
	}, [from, to, status]);

	function applyFilters() {
		const params = new URLSearchParams();
		if (customFrom) params.set("from", customFrom);
		if (customTo) params.set("to", customTo);
		if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
		startTransition(() => {
			router.push(`/commissions?${params.toString()}`);
		});
	}

	function clearFilters() {
		setCustomFrom("");
		setCustomTo("");
		setSelectedStatus("all");
		router.push("/commissions");
	}

	const now = new Date();
	const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const thisMonthEnd = now.toISOString().slice(0, 10);
	const thisYearStart = `${now.getFullYear()}-01-01`;
	const thisYearEnd = thisMonthEnd;

	return (
		<div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
			<div className="flex flex-wrap gap-2 items-center">
				<span className="text-sm font-medium text-zinc-600 mr-1">Period:</span>
				<Button
					size="sm"
					variant={!from && !to ? "default" : "outline"}
					onClick={() => {
						setCustomFrom("");
						setCustomTo("");
						setSelectedStatus("all");
						router.push("/commissions");
					}}
				>
					All time
				</Button>
				<Button
					size="sm"
					variant={from === thisMonthStart && to === thisMonthEnd ? "default" : "outline"}
					onClick={() => {
						const params = new URLSearchParams();
						params.set("from", thisMonthStart);
						params.set("to", thisMonthEnd);
						if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
						router.push(`/commissions?${params.toString()}`);
					}}
				>
					This month
				</Button>
				<Button
					size="sm"
					variant={from === thisYearStart && to === thisYearEnd ? "default" : "outline"}
					onClick={() => {
						const params = new URLSearchParams();
						params.set("from", thisYearStart);
						params.set("to", thisYearEnd);
						if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
						router.push(`/commissions?${params.toString()}`);
					}}
				>
					This year
				</Button>
			</div>

			<div className="flex flex-wrap gap-2 items-center border-l border-zinc-200 pl-4">
				<span className="text-sm font-medium text-zinc-600">Filters:</span>
				
				<Select value={selectedStatus} onValueChange={setSelectedStatus}>
					<SelectTrigger className="w-32 h-9">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="partial">Partial Paid</SelectItem>
						<SelectItem value="paid">Fully Paid</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-wrap gap-2 items-center">
				<span className="text-sm font-medium text-zinc-600">Date range:</span>
				<Input
					type="date"
					value={customFrom}
					onChange={(e) => setCustomFrom(e.target.value)}
					className="w-36 h-9"
				/>
				<span className="text-zinc-400">to</span>
				<Input
					type="date"
					value={customTo}
					onChange={(e) => setCustomTo(e.target.value)}
					className="w-36 h-9"
				/>
				<Button
					size="sm"
					variant="outline"
					onClick={applyFilters}
					disabled={isPending}
				>
					{isPending ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Applying...
						</>
					) : (
						"Apply"
					)}
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={clearFilters}
				>
					Clear
				</Button>
			</div>
		</div>
	);
}
