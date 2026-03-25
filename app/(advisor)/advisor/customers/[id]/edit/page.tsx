import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function AdvisorEditCustomerPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const { data: customer } = await supabase
		.from("customers")
		.select("*")
		.eq("id", id)
		.single();

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

