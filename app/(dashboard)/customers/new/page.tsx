import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { getAdvisors } from "@/app/actions/advisors";

export default async function NewCustomerPage() {
  const advisors = await getAdvisors();

  return (
    <div className="space-y-6">
      <PageHeader title="New Customer" subtitle="Register a new buyer" showBackButton />
      <div className="flex justify-center">
        <CustomerForm mode="create" advisors={advisors} />
      </div>
    </div>
  );
}
