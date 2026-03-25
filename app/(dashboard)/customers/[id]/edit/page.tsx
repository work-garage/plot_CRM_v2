import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { getCustomerById } from "@/app/actions/customers";
import { getAdvisors } from "@/app/actions/advisors";

interface Props {
  params: { id: string };
}

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  const advisors = await getAdvisors();

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Customer"
        subtitle={`Editing: ${customer.name}`}
        showBackButton
      />
      <div className="flex justify-center">
        <CustomerForm mode="edit" initialData={customer} advisors={advisors} />
      </div>
    </div>
  );
}
