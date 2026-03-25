import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorAnalytics } from "@/app/actions/advisors";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, Button } from "@/components/ui";
import { Users, Handshake, IndianRupee, Clock } from "lucide-react";

export default async function AdvisorDashboardPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const data = await getAdvisorAnalytics(advisorId);
	if (!data) redirect("/dashboard");

	return (
		<div className="space-y-6">
			<PageHeader
				title="Advisor Dashboard"
				subtitle={`Welcome, ${data.advisor.name}`}
				action={
					<Link href={`/advisor/customers`}>
						<Button size="sm" variant="outline">
							View Customers
						</Button>
					</Link>
				}
			/>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs font-bold uppercase tracking-wider">
							<Handshake className="h-4 w-4" /> Sales
						</div>
						<p className="text-2xl font-bold">{data.salesCount}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs font-bold uppercase tracking-wider">
							<IndianRupee className="h-4 w-4" /> Project revenue (total)
						</div>
						<p className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-2 text-green-600 mb-2 text-xs font-bold uppercase tracking-wider">
							<IndianRupee className="h-4 w-4" /> My revenue (commissions)
						</div>
						<p className="text-2xl font-bold text-green-700">
							{formatCurrency(data.totalCommission)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-2 text-green-600 mb-2 text-xs font-bold uppercase tracking-wider">
							Paid Commission
						</div>
						<p className="text-2xl font-bold text-green-700">
							{formatCurrency(data.commissionPaid)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-2 text-amber-600 mb-2 text-xs font-bold uppercase tracking-wider">
							<Clock className="h-4 w-4" /> Pending Commission
						</div>
						<p className="text-2xl font-bold text-amber-700">
							{formatCurrency(data.commissionPending)}
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-semibold">My Customers</p>
								<p className="text-xs text-zinc-500">
									View and follow up with your assigned customers
								</p>
							</div>
							<Link href="/advisor/customers">
								<Button size="sm" variant="outline">
									<Users className="h-4 w-4 mr-2" /> Customers
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-semibold">My Sales</p>
								<p className="text-xs text-zinc-500">
									Track collections and dues on your sales
								</p>
							</div>
							<Link href="/advisor/sales">
								<Button size="sm" variant="outline">
									<Handshake className="h-4 w-4 mr-2" /> Sales
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

