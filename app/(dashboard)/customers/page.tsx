import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerCard } from "@/components/customers/customer-card";
import { getCustomers } from "@/app/actions/customers";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} registered plot buyers`}
        action={
          <Link href="/customers/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </Link>
        }
      />

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <Users className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">No customers yet</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            Start by adding your first plot buyer
          </p>
          <Link href="/customers/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Customer
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}
