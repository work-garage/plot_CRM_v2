import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui";
import { getReminders } from "@/app/actions/reminders";
import { getCustomers } from "@/app/actions/customers";
import { ReminderItem } from "@/components/reminders/reminder-item";

export default async function AdvisorMessagingPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const [reminders, customers] = await Promise.all([getReminders(), getCustomers()]);
	const myCustomerIds = new Set(
		(customers ?? []).filter((c: any) => c.advisor_id === advisorId).map((c: any) => c.id)
	);
	const filtered = (reminders ?? []).filter(
		(r: any) => !r.customer_id || myCustomerIds.has(r.customer_id)
	);

	const pending = filtered.filter((r: any) => !r.is_completed);
	const completed = filtered.filter((r: any) => r.is_completed);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Messaging"
				subtitle={`${pending.length} pending`}
				action={
					<Link href="/advisor/messaging/new">
						<Button size="sm" variant="outline">
							Create task
						</Button>
					</Link>
				}
			/>

			<div className="space-y-10">
				<div className="space-y-4">
					<h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Pending</h3>
					<div className="grid grid-cols-1 gap-4">
						{pending.length === 0 ? (
							<div className="py-12 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
								<p className="text-sm text-zinc-400 italic">No pending tasks</p>
							</div>
						) : (
							pending.map((reminder: any) => (
								<ReminderItem key={reminder.id} reminder={reminder} customers={customers} />
							))
						)}
					</div>
				</div>

				{completed.length > 0 && (
					<div className="space-y-4 pt-6 border-t border-zinc-100">
						<h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Completed</h3>
						<div className="grid grid-cols-1 gap-4 opacity-70">
							{completed.map((reminder: any) => (
								<ReminderItem key={reminder.id} reminder={reminder} customers={customers} />
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
