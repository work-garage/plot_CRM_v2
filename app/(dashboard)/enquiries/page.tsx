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

	// Match RLS defaults: missing role = admin (only advisors are explicitly tagged).
	const role = (user.user_metadata as any)?.role ?? "admin";
	if (role === "advisor") redirect("/advisor");

	const [enquiries, projects] = await Promise.all([
		getEnquiryCustomers(),
		getProjects(),
	]);

	return (
		<EnquiriesClient initialEnquiries={enquiries} projects={projects} />
	);
}

