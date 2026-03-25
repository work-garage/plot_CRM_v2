"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Loader2 } from "lucide-react";

const phaseOptions = [
	{ value: "token", label: "Token" },
	{ value: "agreement", label: "Agreement" },
	{ value: "registry", label: "Registry" },
	{ value: "full_payment", label: "Full Payment" },
];

export function SalesFilters({
	projects = [],
}: {
	projects?: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchParams = useSearchParams();
	const from = searchParams.get("from") ?? "";
	const to = searchParams.get("to") ?? "";
	const phase = searchParams.get("phase") ?? "all";
	const advisor = searchParams.get("advisor") ?? "";
	const project = searchParams.get("project") ?? "all";
	const sort = searchParams.get("sort") ?? "newest";
	
	const [customFrom, setCustomFrom] = useState(from);
	const [customTo, setCustomTo] = useState(to);
	const [selectedPhase, setSelectedPhase] = useState(phase);
	const [selectedAdvisor, setSelectedAdvisor] = useState(advisor);
	const [selectedProject, setSelectedProject] = useState(project);
	const [selectedSort, setSelectedSort] = useState(sort);

	useEffect(() => {
		setCustomFrom(from);
		setCustomTo(to);
		setSelectedPhase(phase);
		setSelectedAdvisor(advisor);
		setSelectedProject(project);
		setSelectedSort(sort);
	}, [from, to, phase, advisor, project, sort]);

	function applyFilters() {
		const params = new URLSearchParams();
		if (customFrom) params.set("from", customFrom);
		if (customTo) params.set("to", customTo);
		if (selectedPhase && selectedPhase !== "all") params.set("phase", selectedPhase);
		if (selectedAdvisor && selectedAdvisor !== "all") params.set("advisor", selectedAdvisor);
		if (selectedProject && selectedProject !== "all") params.set("project", selectedProject);
		if (selectedSort && selectedSort !== "newest") params.set("sort", selectedSort);
		startTransition(() => {
			router.push(`/sales?${params.toString()}`);
		});
	}

	function clearFilters() {
		setCustomFrom("");
		setCustomTo("");
		setSelectedPhase("all");
		setSelectedProject("all");
		setSelectedSort("newest");
		router.push("/sales");
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
						setSelectedPhase("all");
						setSelectedProject("all");
						setSelectedSort("newest");
						router.push("/sales");
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
						if (selectedPhase && selectedPhase !== "all") params.set("phase", selectedPhase);
						router.push(`/sales?${params.toString()}`);
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
						if (selectedPhase && selectedPhase !== "all") params.set("phase", selectedPhase);
						router.push(`/sales?${params.toString()}`);
					}}
				>
					This year
				</Button>
			</div>

			<div className="flex flex-wrap gap-2 items-center border-l border-zinc-200 pl-4">
				<span className="text-sm font-medium text-zinc-600">Filters:</span>
				
				<Select value={selectedPhase} onValueChange={setSelectedPhase}>
					<SelectTrigger className="w-36 h-9">
						<SelectValue placeholder="Sales Phase" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Phases</SelectItem>
						{phaseOptions.map(opt => (
							<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={selectedProject} onValueChange={setSelectedProject}>
					<SelectTrigger className="w-40 h-9">
						<SelectValue placeholder="Project" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Projects</SelectItem>
						{projects.map((p) => (
							<SelectItem key={p.id} value={p.id}>
								{p.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={selectedSort} onValueChange={setSelectedSort}>
					<SelectTrigger className="w-44 h-9">
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="newest">Sort: Newest</SelectItem>
						<SelectItem value="oldest">Sort: Oldest</SelectItem>
						<SelectItem value="project">Sort: Project</SelectItem>
						<SelectItem value="layout">Sort: Layout (Phase)</SelectItem>
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
