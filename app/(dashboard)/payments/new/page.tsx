import { PageHeader } from "@/components/shared/page-header";
import { PaymentForm } from "@/components/payments/payment-form";
import { getSales } from "@/app/actions/sales";

interface Props {
  searchParams: { saleId?: string };
}

export default async function NewPaymentPage({ searchParams }: Props) {
  const { saleId } = await searchParams;
  const sales = await getSales();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="New Payment" 
        subtitle="Record a plot installment or token payment" 
        showBackButton
      />
      <div className="flex justify-center">
        <PaymentForm 
          sales={sales} 
          initialSaleId={saleId}
        />
      </div>
    </div>
  );
}
