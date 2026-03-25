import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorCommissions } from "@/app/actions/commissions";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui";

export default async function AdvisorCommissionsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = (user.user_metadata as any)?.role;
  const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
  if (role !== "advisor" || !advisorId) redirect("/dashboard");

  const commissions = await getAdvisorCommissions(advisorId);

  const totals = commissions.reduce(
    (acc, c: any) => {
      const total = Number(c.total_commission_amount ?? 0);
      const paid = Number(c.amount_paid ?? 0);
      acc.total += total;
      acc.paid += paid;
      return acc;
    },
    { total: 0, paid: 0 }
  );
  const pending = totals.total - totals.paid;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Commissions"
        subtitle="Commission earnings for your plot sales"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1">
              Total Commission (All Time)
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totals.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-green-600 mb-1">
              Paid To You
            </div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totals.paid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600 mb-1">
              Pending (Based on Collections)
            </div>
            <div className="text-2xl font-bold text-amber-700">{formatCurrency(pending)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No commissions yet. Once admin records commissions for your sales, they will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plot / Project</TableHead>
                  <TableHead>Total Commission</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((comm: any) => {
                  const total = Number(comm.total_commission_amount ?? 0);
                  const paid = Number(comm.amount_paid ?? 0);
                  const rem = total - paid;
                  const isPaid = rem <= 0;
                  return (
                    <TableRow key={comm.id}>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-zinc-800">
                            {comm.plot_sales?.plots?.plot_number ?? "—"}
                          </span>
                          <span className="text-zinc-500">
                            {comm.plot_sales?.plots?.projects?.name ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(paid)}
                      </TableCell>
                      <TableCell className="font-semibold text-amber-600">
                        {formatCurrency(rem)}
                      </TableCell>
                      <TableCell>
                        {isPaid ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {commissions.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">Payout History</div>
            <div className="space-y-2 text-xs">
              {commissions.flatMap((comm: any) =>
                (comm.advisor_commission_payments ?? []).map((p: any) => ({
                  ...p,
                  _project: comm.plot_sales?.plots?.projects?.name,
                  _plot: comm.plot_sales?.plots?.plot_number,
                }))
              ).length === 0 ? (
                <div className="text-zinc-500">
                  No payments recorded yet.
                </div>
              ) : (
                commissions
                  .flatMap((comm: any) =>
                    (comm.advisor_commission_payments ?? []).map((p: any) => ({
                      ...p,
                      _project: comm.plot_sales?.plots?.projects?.name,
                      _plot: comm.plot_sales?.plots?.plot_number,
                    }))
                  )
                  .sort(
                    (a: any, b: any) =>
                      String(b.paid_date).localeCompare(String(a.paid_date)) ||
                      String(b.created_at).localeCompare(String(a.created_at))
                  )
                  .map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] text-zinc-500">
                          {p.paid_date} • {String(p.payment_mode ?? "cash").toUpperCase()}
                          {p.reference_number ? ` • ${p.reference_number}` : ""}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {p._project ?? "—"} • {p._plot ?? "—"}
                        </div>
                        {p.note && (
                          <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                            {p.note}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-green-700 whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

