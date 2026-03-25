import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getCommissions } from "@/app/actions/commissions";
import { formatCurrency } from "@/lib/utils/formatters";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { CommissionsFilters } from "@/components/commissions/commissions-filters";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const commissions = await getCommissions();

  // Extract filter parameters
  const from = params.from ?? "";
  const to = params.to ?? "";
  const status =
    typeof params.status === "string" && params.status !== "all"
      ? params.status
      : "";

  // Filter commissions based on criteria
  const filteredCommissions = commissions.filter((commission) => {
    // Date range filter (timezone-safe)
    const createdDateStr = String(commission.created_at ?? "").slice(0, 10);
    if (from && (!createdDateStr || createdDateStr < from)) return false;
    if (to && (!createdDateStr || createdDateStr > to)) return false;

    // Status filter
    if (status) {
      const total = Number(commission.total_commission_amount ?? 0);
      const paid = Number(commission.amount_paid ?? 0);
      if (status === "pending" && paid > 0) return false;
      if (status === "partial" && (paid === 0 || paid === total)) return false;
      if (status === "paid" && paid === 0) return false;
      if (status === "paid" && paid < total) return false;
    }

    return true;
  });

  const totalCommissions = filteredCommissions.reduce((sum, c) => sum + Number(c.total_commission_amount), 0);
  const totalPaid = filteredCommissions.reduce((sum, c) => sum + Number(c.amount_paid), 0);
  const totalPending = Math.max(0, totalCommissions - totalPaid);
  const totalExtraPaid = filteredCommissions.reduce((sum, c: any) => {
    const list = Array.isArray(c.advisor_commission_payments)
      ? c.advisor_commission_payments
      : [];
    return (
      sum +
      list.reduce((s: number, p: any) => s + Number(p.extra_paid_amount ?? 0), 0)
    );
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advisors Commissions"
        subtitle={`Tracking ${filteredCommissions.length} commission payouts`}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs font-bold uppercase tracking-wider">
              Total Commission
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalCommissions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-green-500 mb-2 text-xs font-bold uppercase tracking-wider">
              Total Paid
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-500 mb-2 text-xs font-bold uppercase tracking-wider">
              Total Pending
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-amber-600 mb-2 text-xs font-bold uppercase tracking-wider">
              Extra Paid
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalExtraPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <CommissionsFilters />

      {filteredCommissions.length === 0 ? (
        <CommissionsTable commissions={filteredCommissions as any[]} />
      ) : (
        <CommissionsTable commissions={filteredCommissions as any[]} />
      )}
    </div>
  );
}
