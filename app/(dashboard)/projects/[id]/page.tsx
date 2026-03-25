import { notFound } from "next/navigation";
import Link from "next/link";
import {
	LayoutGrid,
	CheckCircle,
	Clock,
	FileText,
	ShieldCheck,
	IndianRupee,
	Pencil,
	ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { getProjectWithStats } from "@/app/actions/project-actions";
import { ProjectEditWrapper } from "@/components/projects/project-edit-wrapper";
import { getPlotsByProject } from "@/app/actions/plots";
import { PlotLayoutGrid } from "@/components/projects/plot-layout-grid";
import { getAdvisors } from "@/app/actions/advisors";
import { getAdvisorAssignmentsByProject } from "@/app/actions/advisor-projects";
import { ProjectAdvisorAssignmentsModal } from "@/components/projects/project-advisor-assignments-modal";
import { PlotForm } from "@/components/projects/plot-form";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ProjectDocumentsModal } from "@/components/projects/project-documents-modal";
import { getProjectDocuments } from "@/app/actions/project-documents";

interface Props {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ edit?: string; plotId?: string }>;
}

export default async function ProjectDetailPage({
	params,
	searchParams,
}: Props) {
	const { id } = await params;
	const { edit, plotId } = await searchParams;
	const data = await getProjectWithStats(id);
	const plots = await getPlotsByProject(id);
	const advisors = await getAdvisors();
	const advisorAssignments = await getAdvisorAssignmentsByProject(id);
	const projectDocs = await getProjectDocuments(id);

	if (!data) {
		notFound();
	}

	const { project, plotCounts, totalRevenue, recentSales } = data;

	const plannedCount = Number(project.total_plots_count ?? 0);
	const plotByNumber = new Map(plots.map((p) => [p.plot_number, p]));
	const layoutPlots =
		plannedCount > 0
			? Array.from({ length: plannedCount }, (_, idx) => {
					const plotNumber = String(idx + 1);
					return (
						plotByNumber.get(plotNumber) ?? {
							id: `planned-${plotNumber}`,
							project_id: project.id,
							plot_number: plotNumber,
							size_sqft: 0,
							rate_per_sqft: 0,
							total_amount: 0,
							status: "available" as const,
							facing: null,
							notes: null,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
							sale: null,
							payments: [],
						}
					);
				})
			: plots;

	// If ?edit=true, show the edit form
	if (edit === "true") {
		return (
			<div>
				<PageHeader
					title="Edit Project"
					subtitle={`Editing: ${project.name}`}
				/>
				<ProjectEditWrapper project={project} />
			</div>
		);
	}

	return (
		<div>
			<PageHeader
				title={project.name}
				subtitle={project.location ?? "No location set"}
				showBackButton
				action={
					<div className="flex flex-wrap gap-2">
						<Link href={`/projects/${project.id}?edit=true`}>
							<Button variant="outline" size="sm">
								<Pencil className="h-4 w-4 mr-2" />
								Edit
							</Button>
						</Link>
						<Dialog>
							<DialogTrigger asChild>
								<Button size="sm">
									<LayoutGrid className="h-4 w-4 mr-2" />
									Add Single Plot
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-2xl">
								<div className="flex items-center justify-between gap-3 border-b border-zinc-100 p-4">
									<div className="text-sm font-medium text-zinc-700">Add Single Plot</div>
									<DialogClose asChild>
										<Button variant="outline" size="sm" className="h-8">
											Close
										</Button>
									</DialogClose>
								</div>
								<PlotForm mode="create" projectId={project.id} />
							</DialogContent>
						</Dialog>
						<ProjectDocumentsModal projectId={project.id} initialDocs={projectDocs as any[]} />
					</div>
				}
			/>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
				<StatCard
					title="Total Plots"
					value={plotCounts.total}
					icon={LayoutGrid}
					color="zinc"
				/>
				<StatCard
					title="Available"
					value={plotCounts.available}
					icon={CheckCircle}
					color="green"
				/>
				<StatCard
					title="Token"
					value={plotCounts.token}
					icon={Clock}
					color="orange"
				/>
				<StatCard
					title="Agreement"
					value={plotCounts.agreement}
					icon={FileText}
					color="blue"
				/>
				<StatCard
					title="Sold"
					value={plotCounts.sold}
					icon={ShieldCheck}
					color="red"
				/>
			</div>

			{/* Plot Layout */}
			{layoutPlots.length > 0 && (
				<Card className="mb-6">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Interactive Plot Layout
						</CardTitle>
					</CardHeader>
					<CardContent>
						<PlotLayoutGrid
							plots={layoutPlots}
							projectName={project.name}
							projectId={project.id}
							initialPlotId={plotId}
						/>
					</CardContent>
				</Card>
			)}

			{/* Advisor assignments */}
			<Card className="mb-6">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-zinc-500">
						Advisor Assignment & Commission Rate (Project-wise)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ProjectAdvisorAssignmentsModal
						projectId={project.id}
						advisors={advisors}
						assignments={advisorAssignments}
					/>
				</CardContent>
			</Card>

			{/* Revenue + Info */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Total Revenue
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
						<p className="text-xs text-zinc-400 mt-1">
							From {recentSales.length} sale(s)
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Plot Capacity
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">
							{plotCounts.total}{" "}
							<span className="text-base font-normal text-zinc-400">
								/ {project.total_plots_count} planned
							</span>
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Description */}
			{project.description && (
				<Card className="mb-6">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Description
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-zinc-700 whitespace-pre-wrap">
							{project.description}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Recent Sales */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Recent Sales</CardTitle>
				</CardHeader>
				<CardContent>
					{recentSales.length === 0 ? (
						<p className="text-sm text-zinc-400 py-4 text-center">
							No sales yet for this project
						</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left text-zinc-500">
										<th className="pb-2 pr-4 font-medium">Plot</th>
										<th className="pb-2 pr-4 font-medium">Customer</th>
										<th className="pb-2 pr-4 font-medium">Advisor</th>
										<th className="pb-2 pr-4 font-medium">Amount</th>
										<th className="pb-2 pr-4 font-medium">Phase</th>
										<th className="pb-2 font-medium">Date</th>
									</tr>
								</thead>
								<tbody>
									{recentSales.map((sale) => (
										<tr key={sale.id} className="border-b last:border-0">
											<td className="py-2.5 pr-4 font-medium">
												{sale.plot_number}
											</td>
											<td className="py-2.5 pr-4">{sale.customer_name}</td>
											<td className="py-2.5 pr-4">{sale.advisor_name}</td>
											<td className="py-2.5 pr-4">
												{formatCurrency(sale.total_sale_amount)}
											</td>
											<td className="py-2.5 pr-4">
												<Badge variant="secondary">{sale.sale_phase}</Badge>
											</td>
											<td className="py-2.5">
												{sale.token_date ? formatDate(sale.token_date) : "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
