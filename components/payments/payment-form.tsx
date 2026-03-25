"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations/payment";
import { createPayment } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/utils/formatters";
import { ReceiptUpload } from "@/components/shared/receipt-upload";
import { ShareReceiptModal } from "@/components/sales/share-receipt-modal";

interface PaymentFormProps {
  sales: any[];
  initialSaleId?: string;
}

export function PaymentForm({ sales, initialSaleId }: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSaleId, setShareSaleId] = useState<string | null>(null);
  const [shareCustomerPhone, setShareCustomerPhone] = useState<string | null>(null);
  const [shareCustomerName, setShareCustomerName] = useState<string | null>(null);
  const [draftId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  );

  const selectedSale = sales.find(s => s.id === initialSaleId);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      sale_id: initialSaleId ?? "",
      customer_id: selectedSale?.customer_id ?? "",
      amount: undefined as any,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: "cash",
      slip_number: "",
      receipt_path: "",
      // Payments recorded through this form are always treated as confirmed
      is_confirmed: true,
      notes: "",
    },
  });

  const currentSaleId = form.watch("sale_id");
  const amountValue = Number(form.watch("amount") || 0);
  const activeSale = useMemo(
    () => sales.find((s) => s.id === currentSaleId),
    [sales, currentSaleId]
  );
  const saleTotal = Number(activeSale?.total_sale_amount ?? 0);
  const salePaid = Number(activeSale?.amount_paid ?? 0);
  const saleRemaining = Math.max(0, saleTotal - salePaid);

  // Update customer_id when sale_id changes
  useEffect(() => {
    const sale = sales.find(s => s.id === currentSaleId);
    if (sale) {
      form.setValue("customer_id", sale.customer_id);
    }
  }, [currentSaleId, sales, form]);

  const fillMockData = () => {
    if (sales.length === 0) {
      toast.error("Need at least one sale to record a payment");
      return;
    }

    const sale = initialSaleId ? selectedSale : sales[Math.floor(Math.random() * sales.length)];
    if (!sale) return;

    const remaining = Math.max(
      0,
      Number(sale.total_sale_amount ?? 0) - Number(sale.amount_paid ?? 0)
    );
    form.reset({
      sale_id: sale.id,
      customer_id: sale.customer_id,
      amount:
        remaining > 0
          ? Math.max(1, Math.min(remaining, Math.floor(Math.random() * 50000) + 5000))
          : 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: "cash",
      slip_number: `SLIP-${Math.floor(Math.random() * 10000)}`,
      receipt_path: "",
      is_confirmed: true,
      notes: "Mock payment for testing Nagpur project installment.",
    });
  };

  const playSubmitTone = (kind: "success" | "error") => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = kind === "success" ? 740 : 210;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "success" ? 0.2 : 0.14));
      osc.start(now);
      osc.stop(now + (kind === "success" ? 0.22 : 0.16));
      setTimeout(() => void ctx.close(), 300);
    } catch {
      // Ignore audio errors (browser policy/device issues)
    }
  };

  async function onSubmit(values: PaymentFormValues) {
    if (saleRemaining <= 0) {
      toast.error("This sale is already fully paid");
      return;
    }
    if (Number(values.amount ?? 0) > saleRemaining) {
      toast.error("Payment exceeds remaining sale amount");
      return;
    }

    setLoading(true);
    setSubmitStatus("idle");
    setStatusText("");
    try {
      const result = await createPayment(values);
      if (!result.success) {
        toast.error("Error", { description: result.error });
        setSubmitStatus("error");
        setStatusText(result.error ?? "Failed to record payment");
        playSubmitTone("error");
        return;
      }

      toast.success("Payment recorded successfully");
      setSubmitStatus("success");
      setStatusText("Payment submitted successfully. Opening receipt sharing...");
      playSubmitTone("success");
      setShareSaleId(values.sale_id);
      setShareCustomerPhone(activeSale?.customers?.phone ?? null);
      setShareCustomerName(activeSale?.customers?.name ?? null);
      setShareModalOpen(true);
    } catch (err) {
      toast.error("Something went wrong");
      setSubmitStatus("error");
      setStatusText("Something went wrong while submitting payment.");
      playSubmitTone("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="max-w-2xl w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <div>
          <CardTitle className="text-lg">Record Payment</CardTitle>
          <CardDescription className="text-xs">
            Add a new payment installment against a sale
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
          Fill Mock Data
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sale_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Sale / Plot *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!initialSaleId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a sale transaction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sales.map((sale) => (
                        <SelectItem key={sale.id} value={sale.id}>
                          {sale.plots.projects.name} - {sale.plots.plot_number} ({sale.customers.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 25000"
                        {...field}
                        max={saleRemaining > 0 ? saleRemaining : undefined}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const sanitized = raw.replace(/^0+(?=\d)/, "");
                          const next = sanitized === "" ? undefined : Number(sanitized);
                          if (next === undefined) {
                            field.onChange(undefined);
                            return;
                          }
                          if (saleRemaining > 0 && next > saleRemaining) {
                            field.onChange(saleRemaining);
                            return;
                          }
                          field.onChange(next);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {currentSaleId && (
              <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Sale Total:</span>
                  <span className="font-medium">{formatCurrency(saleTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Already Paid:</span>
                  <span className="font-medium">{formatCurrency(salePaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Remaining:</span>
                  <span className="font-bold">{formatCurrency(saleRemaining)}</span>
                </div>
                {amountValue > saleRemaining && saleRemaining > 0 && (
                  <div className="text-xs text-red-600 font-medium">
                    Entered amount is above remaining balance.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="payment_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="online">Online / UPI</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slip_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slip / Reference Number</FormLabel>
                    <FormControl><Input placeholder="e.g. UPI Ref or Receipt #" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="receipt_path"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ReceiptUpload
                      folder="payments"
                      recordId={draftId}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Any specific details about this payment" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button
                type="submit"
                disabled={loading}
                className={`min-w-[140px] transition-all duration-300 ${
                  loading
                    ? "scale-[1.02] shadow-md"
                    : submitStatus === "success"
                    ? "bg-green-600 hover:bg-green-600"
                    : ""
                }`}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading
                  ? "Submitting..."
                  : submitStatus === "success"
                  ? "Submitted"
                  : "Record Payment"}
              </Button>
            </div>
            {submitStatus !== "idle" && (
              <div
                className={`mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs animate-in fade-in zoom-in-95 duration-300 ${
                  submitStatus === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {submitStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{statusText}</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
      </Card>

      {shareSaleId && (
        <ShareReceiptModal
          open={shareModalOpen}
          onOpenChange={(open) => {
            setShareModalOpen(open);
            if (!open) {
              router.push("/payments");
              router.refresh();
            }
          }}
          saleId={shareSaleId}
          customerPhone={shareCustomerPhone}
          customerName={shareCustomerName}
          donePath="/payments"
        />
      )}
    </>
  );
}
