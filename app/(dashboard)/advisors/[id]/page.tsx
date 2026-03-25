import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { getAdvisorAnalytics } from "@/app/actions/advisors";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Button,
	Badge,
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
	TableCell,
} from "@/components/ui";
import {
	User,
	Phone,
	MapPin,
	Handshake,
	IndianRupee,
	TrendingUp,
	Clock,
	Pencil,
	Home,
	User as UserIcon,
} from "lucide-react";
import { PasswordResetButton } from "@/components/advisors/password-reset-button";

const phaseLabels: Record<string, string> = {
	token: "Token",
	agreement: "Agreement",
	registry: "Registry",
	full_payment: "Full Payment",
	face1: "Token",
	face2: "Agreement",
	face3: "Registry",
	face4: "Full Payment",
	face5: "Face 5",
	face6: "Face 6",
};

export default async function AdvisorDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const data = await getAdvisorAnalytics(id);

	if (!data) notFound();

	const { advisor, salesCount, totalRevenue, totalCommission, commissionPaid, commissionPending, sales, commissions } = data;

	return (
		<div className="space-y-6">
			<PageHeader
				title={advisor.name}
				subtitle={`Code: ${advisor.code} • ${advisor.is_active ? "Active" : "Inactive"}`}
				action={
					<Link href={`/advisors/${id}/edit`}>
						<Button variant="outline" size="sm">
							<Pencil className="h-4 w-4 mr-2" />
							Edit Advisor
						</Button>
					</Link>
				}
			/>

			{/* Profile Card */}
			<Card>
				<CardContent className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 text-zinc-400" />
								<span className="text-sm font-medium">{advisor.phone}</span>
							</div>
							{advisor.address && (
								<div className="flex items-start gap-2">
									<MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
									<span className="text-sm text-zinc-600">{advisor.address}</span>
								</div>
							)}
							{advisor.birth_date && (
								<p className="text-sm text-zinc-500">
									Birth Date: {formatDate(advisor.birth_date)}
								</p>
							)}
							{advisor.email && (
								<p className="text-xs text-zinc-400">
									Login: {advisor.email}
								</p>
							)}
							<div className="pt-2">
								<PasswordResetButton
									advisorId={advisor.id}
									advisorPhone={advisor.phone}
									className="h-9"
								/>
							</div>
						</div>
						{advisor.notes && (
							<div>
								<p className="text-xs font-bold uppercase text-zinc-400 mb-1">Notes</p>
								<p className="text-sm text-zinc-600">{advisor.notes}</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Analytics Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs font-bold uppercase tracking-wider">
							<Handshake className="h-4 w-4" /> Sales
						</div>
						<p className="text-2xl font-bold">{salesCount}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs font-bold uppercase tracking-wider">
							<TrendingUp className="h-4 w-4" /> Revenue
						</div>
						<p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs font-bold uppercase tracking-wider">
							<IndianRupee className="h-4 w-4" /> Total Commission
						</div>
						<p className="text-2xl font-bold">{formatCurrency(totalCommission)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-green-500 mb-2 text-xs font-bold uppercase tracking-wider">
							Paid
						</div>
						<p className="text-2xl font-bold text-green-600">{formatCurrency(commissionPaid)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-amber-500 mb-2 text-xs font-bold uppercase tracking-wider">
							<Clock className="h-4 w-4" /> Pending
						</div>
						<p className="text-2xl font-bold text-amber-600">{formatCurrency(commissionPending)}</p>
					</CardContent>
				</Card>
			</div>

			{/* Sales Table */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Sales</CardTitle>
					<Link href="/sales/new">
						<Button variant="outline" size="sm">New Sale</Button>
					</Link>
				</CardHeader>
				<CardContent className="p-0">
					{sales.length === 0 ? (
						<div className="py-12 text-center text-zinc-500 text-sm">
							No sales recorded yet
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Plot</TableHead>
									<TableHead>Project</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Paid / Due</TableHead>
									<TableHead>Phase</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sales.map((s) => (
									<TableRow key={s.id}>
										<TableCell className="font-medium">{s.plot_number}</TableCell>
										<TableCell>{s.project_name}</TableCell>
										<TableCell>{s.customer_name}</TableCell>
										<TableCell className="font-semibold">{formatCurrency(s.total_sale_amount)}</TableCell>
										<TableCell>
											<span className="text-green-600">{formatCurrency(s.amount_paid)}</span>
											{" / "}
											<span className="text-red-600">{formatCurrency(s.remaining_amount)}</span>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{phaseLabels[s.sale_phase] ?? s.sale_phase}
											</Badge>
										</TableCell>
										<TableCell>{s.token_date ? formatDate(s.token_date) : "—"}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Commissions Table */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Commission Details</CardTitle>
					<Link href="/commissions">
						<Button variant="outline" size="sm">View All</Button>
					</Link>
				</CardHeader>
				<CardContent className="p-0">
					{commissions.length === 0 ? (
						<div className="py-12 text-center text-zinc-500 text-sm">
							No commission records
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Plot</TableHead>
									<TableHead>Total Commission</TableHead>
									<TableHead>Paid</TableHead>
									<TableHead>Pending</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{commissions.map((c) => (
									<TableRow key={c.id}>
										<TableCell className="font-medium">{c.plot_number}</TableCell>
										<TableCell>{formatCurrency(c.total_commission_amount)}</TableCell>
										<TableCell className="text-green-600">{formatCurrency(c.amount_paid)}</TableCell>
										<TableCell className="text-amber-600 font-medium">{formatCurrency(c.remaining_commission)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
