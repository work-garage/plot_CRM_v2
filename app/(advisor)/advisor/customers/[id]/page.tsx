import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, User, Phone, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { CustomerDocuments } from "@/components/customers/customer-documents";
import { getCustomerById } from "@/app/actions/customers";
import { getCustomerDocuments } from "@/app/actions/customer-documents";
import { getCustomerPlotSales } from "@/app/actions/sales";
import { formatCurrency } from "@/lib/utils/formatters";

export default async function AdvisorCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ensure advisor is logged in (and route is not accessible anonymously).
  const supabase = await createClient();
  if (!supabase) notFound();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const docs = await getCustomerDocuments(id);
  const plotSales = await getCustomerPlotSales(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle="Customer profile"
        showBackButton
        action={
          <Link href={`/advisor/customers/${id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-zinc-900">
              <User className="h-4 w-4 text-zinc-400" />
              <div className="font-semibold">{customer.name}</div>
              {customer.is_active === false ? (
                <Badge variant="secondary" className="text-[10px]">
                  Inactive
                </Badge>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <Phone className="h-4 w-4 text-zinc-400" />
              {customer.phone}
            </div>

            {customer.address ? (
              <div className="flex items-start gap-2 text-sm text-zinc-700">
                <MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
                <div className="whitespace-pre-wrap">{customer.address}</div>
              </div>
            ) : null}

            {customer.notes ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 whitespace-pre-wrap">
                {customer.notes}
              </div>
            ) : null}

            <div className="pt-2 space-y-2">
              <div className="text-xs font-semibold border-b pb-2 uppercase tracking-wider text-zinc-500">
                Transactions (Plots Bought)
              </div>

              {plotSales.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  No sales recorded for this customer.
                </div>
              ) : (
                <div className="space-y-2">
                  {plotSales.map((sale: any) => (
                    <div
                      key={sale.id}
                      className="rounded-md border border-zinc-200 bg-white p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zinc-900 truncate">
                            {sale.plots?.plot_number ?? "—"} •{" "}
                            {sale.plots?.projects?.name ?? "—"}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            Phase: {sale.sale_phase ?? "—"}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {sale.amount_paid >= (sale.total_sale_amount ?? 0)
                            ? "Paid"
                            : "Due"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-[12px]">
                        <span className="text-zinc-500">Paid</span>
                        <span className="font-semibold text-green-700">
                          {formatCurrency(sale.amount_paid ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[12px]">
                        <span className="text-zinc-500">Remaining</span>
                        <span className="font-semibold text-red-700">
                          {formatCurrency(sale.remaining_amount ?? 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <CustomerDocuments
            customerId={id}
            customerName={customer.name}
            initialDocs={docs as any[]}
          />
        </div>
      </div>
    </div>
  );
}

