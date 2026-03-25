import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/customers/customer-form";
import { Button } from "@/components/ui";

export default async function AdvisorNewCustomerPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const { data: advisor } = await supabase
		.from("advisors")
		.select("id, name, code")
		.eq("id", advisorId)
		.single();

	if (!advisor) redirect("/advisor/customers");

	return (
		<div className="space-y-6">
			<PageHeader
				title="New Customer"
				subtitle="Add a buyer for your own portfolio"
				showBackButton
				action={null}
			/>
			<div className="flex justify-center">
				<CustomerForm
					mode="create"
					advisors={[advisor]}
					redirectTo="/advisor/customers"
				/>
			</div>
		</div>
	);
}

