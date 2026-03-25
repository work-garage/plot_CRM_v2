"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { Loader2 } from "lucide-react";

export function ReportsFilters({ basePath = "/reports" }: { basePath?: string }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchParams = useSearchParams();
	const from = searchParams.get("from") ?? "";
	const to = searchParams.get("to") ?? "";
	const [customFrom, setCustomFrom] = useState(from);
	const [customTo, setCustomTo] = useState(to);

	useEffect(() => {
		setCustomFrom(from);
		setCustomTo(to);
	}, [from, to]);

	function setRange(start: string, end: string) {
		const params = new URLSearchParams();
		if (start) params.set("from", start);
		if (end) params.set("to", end);
		startTransition(() => {
			router.push(`${basePath}?${params.toString()}`);
		});
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
					onClick={() => setRange("", "")}
				>
					All time
				</Button>
				<Button
					size="sm"
					variant={from === thisMonthStart && to === thisMonthEnd ? "default" : "outline"}
					onClick={() => setRange(thisMonthStart, thisMonthEnd)}
				>
					This month
				</Button>
				<Button
					size="sm"
					variant={from === thisYearStart && to === thisYearEnd ? "default" : "outline"}
					onClick={() => setRange(thisYearStart, thisYearEnd)}
				>
					This year
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={() => {
						const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
						const start = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
						const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
						setRange(start, end);
					}}
				>
					Last month
				</Button>
			</div>
			<div className="flex flex-wrap gap-2 items-center border-l border-zinc-200 pl-4">
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
					onClick={() => setRange(customFrom, customTo)}
					disabled={!customFrom || !customTo || isPending}
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
			</div>
		</div>
	);
}
