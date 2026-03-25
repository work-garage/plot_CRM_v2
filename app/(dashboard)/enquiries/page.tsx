import { redirect } from "next/navigation";
import { EnquiriesClient } from "@/components/enquiries/enquiries-client";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/app/actions/project-actions";
import { getEnquiryCustomers } from "@/app/actions/enquiries";

export default async function EnquiriesPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role ?? "admin";
	if (role === "advisor") redirect("/advisor/enquiries");

	const [enquiries, projects] = await Promise.all([
		getEnquiryCustomers(),
		getProjects(),
	]);

	// Fetch all active advisors for the admin to assign
	const { data: advisorRows } = await supabase
		.from("advisors")
		.select("id, name")
		.eq("is_active", true)
		.order("name");

	const advisors = (advisorRows ?? []).map((a: any) => ({ id: a.id, name: a.name }));

	return (
		<EnquiriesClient
			initialEnquiries={enquiries}
			projects={projects}
			advisors={advisors}
		/>
	);
}
