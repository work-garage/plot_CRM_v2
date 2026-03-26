import { PageHeader } from "@/components/shared/page-header";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { createClient } from "@/lib/supabase/server";
import { getCustomers } from "@/app/actions/customers";

export default async function AdvisorNewMessagingPage() {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }
  const customers = await getCustomers({ includeAllStatuses: false, includeInactive: true });

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader title="New task" subtitle="Schedule a follow-up for your own customers" showBackButton action={null} />
      <div className="flex justify-center">
        <ReminderForm
          customers={(customers ?? []) as any[]}
          projects={(projects ?? []) as any[]}
          redirectTo="/advisor/messaging"
        />
      </div>
    </div>
  );
}
