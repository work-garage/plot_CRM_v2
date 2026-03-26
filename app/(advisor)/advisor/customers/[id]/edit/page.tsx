import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/customers/customer-form";
import { getCustomerById } from "@/app/actions/customers";
import { getScopeContext } from "@/lib/server/scope";

export default async function AdvisorEditCustomerPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const supabase = await createClient();
	if (!supabase) redirect("/login");
	const { user, role, advisorId } = await getScopeContext(supabase);
	if (!user) redirect("/login");
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const customer = await getCustomerById(id);
	if (!customer || customer.advisor_id !== advisorId) redirect("/advisor/customers");

	const { data: advisor } = await supabase
		.from("advisors")
		.select("id, name, code")
		.eq("id", advisorId)
		.single();

	if (!advisor) redirect("/advisor/customers");

	return (
		<div className="space-y-6">
			<PageHeader
				title="Edit Customer"
				subtitle="Update buyer details"
				showBackButton
			/>
			<div className="flex justify-center">
				<CustomerForm
					mode="edit"
					initialData={customer}
					advisors={[advisor]}
					redirectTo="/advisor/customers"
				/>
			</div>
		</div>
	);
}
