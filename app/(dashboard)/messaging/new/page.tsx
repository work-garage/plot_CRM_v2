import { PageHeader } from "@/components/shared/page-header";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { getCustomers } from "@/app/actions/customers";
import { getProjects } from "@/app/actions/project-actions";

export default async function NewMessagingTaskPage() {
	const [customers, projects] = await Promise.all([getCustomers(), getProjects()]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="New task"
				subtitle="Schedule a follow-up or important task"
				showBackButton
			/>
			<div className="flex justify-center">
				<ReminderForm customers={customers} projects={projects as any[]} />
			</div>
		</div>
	);
}
