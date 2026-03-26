import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@/components/ui";
import { formatDate } from "@/lib/utils/formatters";
import { getCustomers } from "@/app/actions/customers";
import Link from "next/link";

export default async function AdvisorCustomersPage() {
  const customers = await getCustomers({ includeAllStatuses: false, includeInactive: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Customers"
        subtitle={`${customers.length} customers assigned to you`}
        action={null}
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Birth Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-zinc-500">No customers assigned yet.</TableCell>
                </TableRow>
              ) : (
                (customers as any[]).map((customer: any) => (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-zinc-50">
                    <TableCell className="font-medium">
                      <Link href={`/advisor/customers/${customer.id}`} className="block w-full">{customer.name}</Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/advisor/customers/${customer.id}`} className="block w-full">{customer.phone}</Link>
                    </TableCell>
                    <TableCell>{customer.route || "-"}</TableCell>
                    <TableCell>{customer.birth_date ? formatDate(customer.birth_date) : "-"}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/advisor/customers/${customer.id}/edit`}>
                        <Button size="sm" variant="outline" className="h-8 px-2">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
