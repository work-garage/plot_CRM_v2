import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui";
import { getReminders } from "@/app/actions/reminders";
import { getCustomers } from "@/app/actions/customers";
import { ReminderItem } from "@/components/reminders/reminder-item";

export default async function AdvisorMessagingPage() {
  const [reminders, customers] = await Promise.all([
    getReminders(),
    getCustomers({ includeAllStatuses: false, includeInactive: true }),
  ]);

  const myCustomerIds = new Set((customers ?? []).map((customer: any) => customer.id));
  const filtered = (reminders ?? []).filter((reminder: any) => !reminder.customer_id || myCustomerIds.has(reminder.customer_id));
  const pending = filtered.filter((reminder: any) => !reminder.is_completed);
  const completed = filtered.filter((reminder: any) => reminder.is_completed);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messaging"
        subtitle={`${pending.length} pending`}
        action={
          <Link href="/advisor/messaging/new">
            <Button size="sm" variant="outline">Create task</Button>
          </Link>
        }
      />

      <div className="space-y-10">
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Pending</h3>
          <div className="grid grid-cols-1 gap-4">
            {pending.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-12 text-center">
                <p className="text-sm italic text-zinc-400">No pending tasks</p>
              </div>
            ) : (
              pending.map((reminder: any) => (
                <ReminderItem key={reminder.id} reminder={reminder} customers={customers} />
              ))
            )}
          </div>
        </div>

        {completed.length > 0 && (
          <div className="space-y-4 border-t border-zinc-100 pt-6">
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
