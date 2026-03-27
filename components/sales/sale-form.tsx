"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
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
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale";
import { createSale } from "@/app/actions/sales";
import { ShareReceiptModal } from "./share-receipt-modal";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/formatters";
import { calculateFinance } from "@/lib/utils/finance";

interface SaleFormProps {
  plots: any[];
  customers: any[];
  advisors: any[];
  initialPlotId?: string;
  initialCustomerId?: string;
  lockPlotSelection?: boolean;
  lockCustomerSelection?: boolean;
  hideMockData?: boolean;
  onCancel?: () => void;
  onSuccess?: (saleId: string) => void;
  advisorAssignments?: Array<{
    project_id: string;
    advisor_id: string;
    commission_rate: number;
  }>;
}

type EntryMode = "auto" | "manual";

const SAFE_ZERO_FINANCE = {
  baseTotal: 0,
  sellingPrice: 0,
  profit: 0,
  received: 0,
  ratio: 0,
  advisorEarned: 0,
  remaining: 0,
  remainingPotential: 0,
  downPaymentPaymentRecord: null,
} as const;

function parseNonNegativeNumber(value: string): number | undefined {
  if (value === "") return undefined;
  const next = Number(value);
  if (!Number.isFinite(next)) return undefined;
  return Math.max(0, next);
}

function parseBoundedInteger(value: string, min: number, max: number): number | undefined {
  if (value === "") return undefined;
  const next = Math.trunc(Number(value));
  if (!Number.isFinite(next)) return undefined;
  return Math.min(max, Math.max(min, next));
}

function getProjectId(plot: any): string | null {
  return plot?.project_id ?? plot?.projects?.id ?? null;
}

export function SaleForm({
  plots,
  customers,
  advisors,
  initialPlotId,
  initialCustomerId,
  lockPlotSelection = false,
  lockCustomerSelection = false,
  hideMockData = false,
  onCancel,
  onSuccess,
  advisorAssignments,
}: SaleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [pricingMode, setPricingMode] = useState<EntryMode>("auto");
  const [emiMode, setEmiMode] = useState<EntryMode>("auto");
  const [shareModal, setShareModal] = useState<{ saleId: string; customerPhone?: string | null; customerName?: string | null } | null>(null);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      plot_id: initialPlotId || "",
      customer_id: initialCustomerId || "",
      sold_by_admin: false,
      advisor_id: "" as string | null,
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      agreement_date: "",
      total_sale_amount: undefined as any,
      down_payment: undefined as any,
      emi_months: undefined as any,
      monthly_emi: undefined as any,
      emi_day: 5,
      followup_date: "",
      notes: "",
    },
  });

  const selectedPlotId = form.watch("plot_id");
  const selectedCustomerId = form.watch("customer_id");
  const soldByAdmin = form.watch("sold_by_admin");
  const selectedAdvisorId = form.watch("advisor_id");
  const selectedPhase = form.watch("sale_phase");
  const totalSaleAmount = Number(form.watch("total_sale_amount") ?? 0);
  const downPayment = Number(form.watch("down_payment") ?? 0);
  const emiMonths = Number(form.watch("emi_months") ?? 0);
  const phaseDateFieldName = selectedPhase === "token" ? "token_date" : "agreement_date";
  const phaseDateLabel =
    selectedPhase === "token"
      ? "Token Date"
      : selectedPhase === "agreement"
      ? "Agreement Date"
      : selectedPhase === "registry"
      ? "Registry Date"
      : "Full Payment Date";

  const selectedPlot = useMemo(
    () => plots.find((p) => p.id === selectedPlotId) ?? null,
    [plots, selectedPlotId]
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const selectedProjectId = getProjectId(selectedPlot);

  const filteredPlots = plots;
  const filteredAdvisors = advisors;

  useEffect(() => {
    if (soldByAdmin) {
      form.setValue("advisor_id", null, { shouldValidate: true });
    } else if (!selectedAdvisorId && selectedCustomer?.advisor_id) {
      form.setValue("advisor_id", selectedCustomer.advisor_id, { shouldValidate: true });
    }
  }, [form, selectedAdvisorId, selectedCustomer?.advisor_id, soldByAdmin]);

  // Keep one visible date in sync when switching phase (token ↔ other phases use different form keys).
  useEffect(() => {
    const token = form.getValues("token_date");
    const agr = form.getValues("agreement_date");
    if (selectedPhase === "token") {
      if (!token && agr) form.setValue("token_date", agr);
    } else {
      if (!agr && token) form.setValue("agreement_date", token);
    }
  }, [selectedPhase, form]);

  const plotSize = Number(selectedPlot?.size_sqft ?? 0);
  const plotBaseRatePerSqft = Number(selectedPlot?.rate_per_sqft ?? 0);

  const advisorAssignment = useMemo(() => {
    if (!selectedAdvisorId || !selectedProjectId) return null;
    return (
      (advisorAssignments ?? []).find(
        (a) => a.advisor_id === selectedAdvisorId && a.project_id === selectedProjectId
      ) ?? null
    );
  }, [advisorAssignments, selectedAdvisorId, selectedProjectId]);

  const assignedFaceRatePerSqft = soldByAdmin
    ? plotBaseRatePerSqft
    : Number((advisorAssignment as any)?.commission_rate ?? 0);
  const receivedNow = Math.max(0, downPayment);
  const autoSellingPrice =
    plotSize > 0 && assignedFaceRatePerSqft > 0 ? plotSize * assignedFaceRatePerSqft : 0;
  const assignmentMissing =
    !soldByAdmin && !!selectedPlot && !!selectedAdvisorId && !advisorAssignment;
  const remaining = Math.max(0, totalSaleAmount - downPayment);

  useEffect(() => {
    if (pricingMode !== "auto") return;
    if (!selectedPlot) {
      form.setValue("total_sale_amount", undefined as any, { shouldValidate: true });
      return;
    }
    if (autoSellingPrice > 0) {
      form.setValue("total_sale_amount", autoSellingPrice, { shouldValidate: true });
      return;
    }
    form.setValue("total_sale_amount", undefined as any, { shouldValidate: true });
  }, [autoSellingPrice, form, pricingMode, selectedPlot]);

  useEffect(() => {
    if (selectedPhase !== "full_payment") return;
    if (totalSaleAmount > 0) {
      form.setValue("down_payment", totalSaleAmount, { shouldValidate: true });
    }
    form.setValue("emi_months", null, { shouldValidate: true });
    form.setValue("monthly_emi", null, { shouldValidate: true });
    form.setValue("emi_day", null, { shouldValidate: true });
    form.setValue("followup_date", "", { shouldValidate: true });
  }, [form, selectedPhase, totalSaleAmount]);

  useEffect(() => {
    if (selectedPhase === "full_payment") return;
    if (emiMode !== "auto") return;
    if (emiMonths >= 1 && remaining > 0) {
      form.setValue("monthly_emi", Math.ceil(remaining / emiMonths), { shouldValidate: true });
      return;
    }
    form.setValue("monthly_emi", undefined as any, { shouldValidate: true });
  }, [emiMode, emiMonths, form, remaining, selectedPhase]);
  const finance = useMemo(() => {
    if (!selectedPlot || plotSize <= 0 || plotBaseRatePerSqft <= 0 || totalSaleAmount <= 0) {
      return {
        ...SAFE_ZERO_FINANCE,
        baseTotal: plotSize > 0 && plotBaseRatePerSqft > 0 ? plotSize * plotBaseRatePerSqft : 0,
        sellingPrice: Math.max(0, totalSaleAmount),
        received: receivedNow,
        remaining,
      };
    }

    try {
      return calculateFinance({
        plotSizeSqft: plotSize,
        baseRatePerSqft: plotBaseRatePerSqft,
        advisorRatePerSqft: assignedFaceRatePerSqft || null,
        sellingPriceOverride: totalSaleAmount,
        downPayment: receivedNow,
        otherPayments: 0,
      });
    } catch {
      const baseTotal = plotSize * plotBaseRatePerSqft;
      const ratio = totalSaleAmount > 0 ? Math.min(1, receivedNow / totalSaleAmount) : 0;
      const profit = totalSaleAmount - baseTotal;
      const eligibleProfit = Math.max(0, profit);
      return {
        ...SAFE_ZERO_FINANCE,
        baseTotal,
        sellingPrice: totalSaleAmount,
        profit,
        received: receivedNow,
        ratio,
        advisorEarned: eligibleProfit * ratio,
        remaining,
        remainingPotential: Math.max(0, eligibleProfit - eligibleProfit * ratio),
      };
    }
  }, [
    assignedFaceRatePerSqft,
    plotBaseRatePerSqft,
    plotSize,
    receivedNow,
    remaining,
    selectedPlot,
    totalSaleAmount,
  ]);

  const fillMockData = () => {
    if (plots.length === 0 || customers.length === 0 || advisors.length === 0) {
      toast.error("Need at least one plot, customer, and advisor to fill mock data");
      return;
    }

    const randomPlot = plots[Math.floor(Math.random() * plots.length)];
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const compatibleAssignments = (advisorAssignments ?? []).filter(
      (assignment) => assignment.project_id === getProjectId(randomPlot)
    );
    const advisorPool =
      compatibleAssignments.length > 0
        ? advisors.filter((advisor) =>
            compatibleAssignments.some((assignment) => assignment.advisor_id === advisor.id)
          )
        : advisors;
    const randomAdvisor = advisorPool[Math.floor(Math.random() * advisorPool.length)];
    const randomAssignment =
      compatibleAssignments.find((assignment) => assignment.advisor_id === randomAdvisor?.id) ?? null;
    const selling =
      randomAssignment && Number(randomPlot.size_sqft ?? 0) > 0
        ? Number(randomPlot.size_sqft ?? 0) * Number(randomAssignment.commission_rate ?? 0)
        : Number(randomPlot.size_sqft ?? 0) * Number(randomPlot.rate_per_sqft ?? 0);

    setPricingMode("auto");
    setEmiMode("auto");
    form.reset({
      plot_id: randomPlot.id,
      customer_id: randomCustomer.id,
      sold_by_admin: false,
      advisor_id: randomAdvisor?.id ?? null,
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      total_sale_amount: selling || undefined,
      down_payment: selling ? Math.floor(selling * 0.1) : undefined,
      emi_months: 12,
      monthly_emi: selling ? Math.ceil((selling * 0.9) / 12) : undefined,
      emi_day: 5,
      followup_date: "",
      notes: "Mock sale generated for testing Nagpur project.",
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
      osc.frequency.value = kind === "success" ? 760 : 220;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + (kind === "success" ? 0.22 : 0.16)
      );
      osc.start(now);
      osc.stop(now + (kind === "success" ? 0.24 : 0.18));
      setTimeout(() => void ctx.close(), 320);
    } catch {
      // ignore
    }
  };

  async function onSubmit(values: SaleFormValues) {
    setLoading(true);
    setSubmitStatus("idle");
    setStatusText("");
    try {
      const result = await createSale(values);
      if (!result.success) {
        toast.error("Error", { description: result.error });
        setSubmitStatus("error");
        setStatusText(result.error ?? "Failed to record sale");
        playSubmitTone("error");
        return;
      }

      toast.success("Sale recorded successfully");
      setSubmitStatus("success");
      setStatusText("Sale submitted successfully. Opening receipt sharing...");
      playSubmitTone("success");
      const customer = customers.find((c) => c.id === values.customer_id);
      if (result.saleId) {
        setShareModal({
          saleId: result.saleId,
          customerPhone: customer?.phone ?? null,
          customerName: customer?.name ?? null,
        });
        onSuccess?.(result.saleId);
      } else {
        setShareModal(null);
      }
    } catch {
      toast.error("Something went wrong");
      setSubmitStatus("error");
      setStatusText("Something went wrong while submitting the sale.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <Card className="max-w-4xl w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <div>
          <CardTitle className="text-lg">New Sale / Booking</CardTitle>
          <CardDescription className="text-xs">Record a new plot transaction</CardDescription>
        </div>
        {!hideMockData ? (
        <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
          Fill Mock Data
        </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Selections */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold border-b pb-1.5 uppercase tracking-wider text-zinc-500">
                  Entities
                </h3>
                
                <FormField
                  control={form.control}
                  name="plot_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Plot *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger disabled={lockPlotSelection}>
                            <SelectValue placeholder="Choose an available plot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredPlots.map((plot) => (
                            <SelectItem key={plot.id} value={plot.id}>
                              {plot.projects.name} - {plot.plot_number} ({plot.size_sqft} sqft)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger disabled={lockCustomerSelection}>
                            <SelectValue placeholder="Choose a buyer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} ({customer.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sold_by_admin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sold By</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "admin")}
                        value={field.value ? "admin" : "advisor"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="advisor">Advisor</SelectItem>
                          <SelectItem value="admin">Admin (Direct)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!soldByAdmin && (
                  <FormField
                    control={form.control}
                    name="advisor_id"
                    render={({ field }) => (
                      <FormItem>
                      <FormLabel>Select Advisor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose any advisor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredAdvisors.map((advisor) => (
                              <SelectItem key={advisor.id} value={advisor.id}>
                                {advisor.name} ({advisor.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <h3 className="text-xs font-semibold border-b pb-2 uppercase tracking-wider text-zinc-500">
                  Sale Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="sale_phase"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1 min-w-0">
                        <FormLabel>Sale Phase *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select phase" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="token">Token/Booking</SelectItem>
                            <SelectItem value="agreement">Agreement</SelectItem>
                            <SelectItem value="registry">Registry</SelectItem>
                            <SelectItem value="full_payment">Full Payment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    key={phaseDateFieldName}
                    control={form.control}
                    name={phaseDateFieldName as "token_date" | "agreement_date"}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1 min-w-0">
                        <FormLabel>{phaseDateLabel}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <p className="text-[11px] text-zinc-500">
                          Stored on the sale as{" "}
                          {selectedPhase === "token" ? "token date" : "agreement / phase date"}.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Payment schedule, special requests, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Financials */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold border-b pb-2 uppercase tracking-wider text-zinc-500">
                  Financials
                </h3>
                
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-zinc-900">Selling Price</div>
                      <div className="text-[11px] text-zinc-500">
                        Auto uses plot size × effective rate. Manual override is saved and reused everywhere.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={pricingMode === "auto" ? "default" : "outline"}
                        onClick={() => {
                          setPricingMode("auto");
                          if (autoSellingPrice > 0) {
                            form.setValue("total_sale_amount", autoSellingPrice, { shouldValidate: true });
                          }
                        }}
                      >
                        Auto
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={pricingMode === "manual" ? "default" : "outline"}
                        onClick={() => setPricingMode("manual")}
                      >
                        Manual
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="total_sale_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {pricingMode === "auto" ? "Selling Price (Auto)" : "Selling Price (Manual)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            disabled={pricingMode === "auto"}
                            onChange={(e) => {
                              field.onChange(parseNonNegativeNumber(e.target.value));
                              if (pricingMode !== "manual") setPricingMode("manual");
                            }}
                          />
                        </FormControl>
                        <p className="text-[11px] text-zinc-500">
                          Auto suggestion: {autoSellingPrice > 0 ? formatCurrency(autoSellingPrice) : "Waiting for valid rate"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="down_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedPhase === "full_payment"
                            ? "Amount Received (Full Payment)"
                            : "Down Payment"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            disabled={selectedPhase === "full_payment"}
                            onChange={(e) => {
                              field.onChange(parseNonNegativeNumber(e.target.value));
                            }}
                          />
                        </FormControl>
                        {selectedPhase === "full_payment" ? (
                          <p className="text-[11px] text-zinc-500">
                            Matches selling price — no EMI for full payment.
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                </div>

                <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Remaining Balance:</span>
                    <span className="font-bold">{formatCurrency(remaining)}</span>
                  </div>
                </div>

                {remaining > 0 && selectedPhase !== "full_payment" && (
                  <FormField
                    control={form.control}
                    name="followup_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow-up Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} placeholder="Next payment follow-up" />
                        </FormControl>
                        <p className="text-[11px] text-zinc-500">Reminder will be created for this date</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlot ? (
                  <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200 space-y-2">
                    <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                      {soldByAdmin ? "Pricing (Admin Direct - No Commission)" : "Pricing, Profit & Advisor Earnings"}
                    </h4>

                    {assignmentMissing ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        This advisor is not assigned to the selected plot&apos;s project. The plot remains selected, but submission stays blocked until you choose a valid advisor.
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Plot base rate / sqft
                        </div>
                        <div className="font-semibold text-zinc-900">
                          {formatCurrencyShort(plotBaseRatePerSqft)}/sqft
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right">
                          Plot Size
                        </div>
                        <div className="font-semibold text-zinc-900 text-right">
                          {plotSize.toLocaleString("en-IN")} sqft
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Base Price (Total)
                        </div>
                        <div className="font-semibold text-zinc-900">
                          {formatCurrency(finance.baseTotal)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right">
                          {soldByAdmin ? "Admin (plot base) / sqft" : "Advisor Rate / sqft"}
                        </div>
                        <div className="font-semibold text-zinc-900 text-right">
                          {assignedFaceRatePerSqft > 0 ? `${formatCurrencyShort(assignedFaceRatePerSqft)}/sqft` : "₹0/sqft"}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Selling Price (Total)
                        </div>
                        <div className="font-bold text-zinc-900">
                          {formatCurrency(finance.sellingPrice)}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Mode: {pricingMode === "auto" ? "Auto suggestion" : "Manual override"}
                          {pricingMode === "manual" && autoSellingPrice > 0
                            ? ` • Diff vs auto: ${formatCurrency(finance.sellingPrice - autoSellingPrice)}`
                            : ""}
                        </div>
                      </div>

                      {!soldByAdmin && (
                        <>
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                              Total Profit
                            </div>
                            <div className={`font-semibold ${finance.profit < 0 ? "text-red-600" : "text-zinc-900"}`}>
                              {formatCurrency(finance.profit)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right">
                              Advisor Earned (Based on Received)
                            </div>
                            <div className="font-semibold text-zinc-900 text-right">
                              {formatCurrency(finance.advisorEarned)}
                            </div>
                            <div className="text-[11px] text-zinc-500 text-right">
                              Remaining potential: {formatCurrency(finance.remainingPotential)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-1">
                      <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                        <span>
                          Received: ₹{receivedNow.toLocaleString("en-IN")}
                        </span>
                        <span>{Math.round(finance.ratio * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                        <div
                          className="h-full bg-zinc-900"
                          style={{ width: `${Math.round(finance.ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {selectedPhase !== "full_payment" && remaining > 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-zinc-900">Monthly EMI</div>
                        <div className="text-[11px] text-zinc-500">
                          Auto mode fills EMI from remaining balance and EMI months.
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={emiMode === "auto" ? "default" : "outline"}
                          onClick={() => setEmiMode("auto")}
                        >
                          Auto
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={emiMode === "manual" ? "default" : "outline"}
                          onClick={() => setEmiMode("manual")}
                        >
                          Manual
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="emi_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EMI Months</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                              placeholder="e.g. 12"
                              min={1}
                              max={120}
                              onChange={(e) => {
                                field.onChange(parseBoundedInteger(e.target.value, 1, 120));
                                if (emiMode !== "manual") setEmiMode("auto");
                              }}
                            />
                          </FormControl>
                          <p className="text-[11px] text-zinc-500">Used for auto EMI calculation.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthly_emi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly EMI</FormLabel>
                          <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            disabled={emiMode === "auto" && emiMonths >= 1}
                            onChange={(e) => {
                              field.onChange(parseNonNegativeNumber(e.target.value));
                              if (emiMode !== "manual") setEmiMode("manual");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                      control={form.control}
                      name="emi_day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EMI Day (1-31)</FormLabel>
                          <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            step="1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(parseBoundedInteger(e.target.value, 1, 31));
                            }}
                          />
                        </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    </div>
                  </div>
                ) : null}
                {selectedPhase === "full_payment" ? (
                  <p className="text-[11px] text-zinc-500">
                    EMI fields are hidden when the sale is recorded as full payment.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                    return;
                  }
                  router.back();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || assignmentMissing}
                className={`min-w-[130px] transition-all duration-300 ${
                  loading
                    ? "scale-[1.02] shadow-md"
                    : submitStatus === "success"
                    ? "bg-green-600 hover:bg-green-600"
                    : ""
                }`}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Submitting..." : submitStatus === "success" ? "Submitted" : "Confirm Sale"}
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

    {shareModal && (
      <ShareReceiptModal
        open={!!shareModal}
        onOpenChange={(o) => !o && setShareModal(null)}
        saleId={shareModal.saleId}
        customerPhone={shareModal.customerPhone}
        customerName={shareModal.customerName}
      />
    )}
    </>
  );
}
