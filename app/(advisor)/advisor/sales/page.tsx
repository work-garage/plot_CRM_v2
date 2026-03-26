import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SalesList } from "@/components/sales/sales-list";
import { getSales } from "@/app/actions/sales";
import { requireModule } from "@/lib/server/modules";

export default async function AdvisorSalesPage() {
  await requireModule("sales", "/advisor");
  const sales = await getSales();

  return (
    <div className="space-y-6">
      <PageHeader title="My Sales" subtitle={`${sales.length} sales`} />
      {sales.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-16 text-center text-zinc-500">
          No sales recorded yet.
        </div>
      ) : (
        <SalesList sales={sales as any[]} canCollectPayments={false} />
      )}
    </div>
  );
}
