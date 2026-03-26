import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { getPayments } from "@/app/actions/payments";
import { requireModule } from "@/lib/server/modules";

export default async function AdvisorPaymentsPage() {
  await requireModule("payments", "/advisor");
  const payments = await getPayments();

  return (
    <div className="space-y-6">
      <PageHeader title="My Payments" subtitle={`${payments.length} payments`} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Plot</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                    No payments yet.
                  </TableCell>
                </TableRow>
              ) : (
                (payments as any[]).map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{formatDate(payment.payment_date)}</TableCell>
                    <TableCell>{payment.customers?.name ?? "-"}</TableCell>
                    <TableCell>
                      {payment.plot_sales?.plots?.plot_number ?? "-"}
                      <div className="text-xs text-zinc-400">{payment.plot_sales?.plots?.projects?.name ?? ""}</div>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="capitalize">{payment.payment_mode}</TableCell>
                    <TableCell>
                      {payment.is_confirmed ? (
                        <Badge className="border-green-200 bg-green-100 text-green-800">Pakka</Badge>
                      ) : (
                        <Badge className="border-yellow-200 bg-yellow-100 text-yellow-800">Kaccha</Badge>
                      )}
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
