import { redirect } from "next/navigation";
import { EnquiriesClient } from "@/components/enquiries/enquiries-client";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/app/actions/project-actions";
import { getEnquiryCustomers } from "@/app/actions/enquiries";

export default async function AdvisorEnquiriesPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role ?? "admin";
	// Only advisors can access this page; admins go to /enquiries
	if (role !== "advisor") redirect("/enquiries");

	const [enquiries, projects] = await Promise.all([
		getEnquiryCustomers(), // RLS auto-scopes to this advisor's leads
		getProjects(),
	]);

	return (
		<EnquiriesClient
			initialEnquiries={enquiries}
			projects={projects}
			advisors={[]} // Advisor cannot reassign to other advisors
			canManageOutcomes={false}
		/>
	);
}
