"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Calculator, CheckCircle2, AlertCircle } from "lucide-react";
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
  advisorAssignments?: Array<{
    project_id: string;
    advisor_id: string;
    commission_rate: number;
  }>;
}

export function SaleForm({
  plots,
  customers,
  advisors,
  initialPlotId,
  advisorAssignments,
}: SaleFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [shareModal, setShareModal] = useState<{ saleId: string; customerPhone?: string | null; customerName?: string | null } | null>(null);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      plot_id: initialPlotId || "",
      customer_id: "",
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
  const soldByAdmin = form.watch("sold_by_admin");
  const selectedAdvisorId = form.watch("advisor_id");
  const selectedPhase = form.watch("sale_phase");
  const totalSaleAmount = form.watch("total_sale_amount") ?? 0;
  const downPayment = form.watch("down_payment") ?? 0;
  const emiMonths = form.watch("emi_months");
  const remaining = totalSaleAmount - downPayment;
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

  const selectedProjectId =
    selectedPlot?.project_id ?? selectedPlot?.projects?.id ?? null;

  const allowedProjectIdsForAdvisor = useMemo(() => {
    if (!selectedAdvisorId) return null;
    const set = new Set<string>();
    (advisorAssignments ?? []).forEach((a) => {
      if (a.advisor_id === selectedAdvisorId) set.add(a.project_id);
    });
    return set;
  }, [advisorAssignments, selectedAdvisorId]);

  const allowedAdvisorIdsForProject = useMemo(() => {
    if (!selectedProjectId) return null;
    const set = new Set<string>();
    (advisorAssignments ?? []).forEach((a) => {
      if (a.project_id === selectedProjectId) set.add(a.advisor_id);
    });
    return set;
  }, [advisorAssignments, selectedProjectId]);

  const filteredPlots = useMemo(() => {
    if (soldByAdmin) return plots;
    if (!allowedProjectIdsForAdvisor) return plots;
    return plots.filter((p) => {
      const pid = p.project_id ?? p.projects?.id;
      return pid ? allowedProjectIdsForAdvisor.has(pid) : false;
    });
  }, [allowedProjectIdsForAdvisor, plots, soldByAdmin]);

  const filteredAdvisors = useMemo(() => {
    if (!allowedAdvisorIdsForProject) return advisors;
    return advisors.filter((a) => allowedAdvisorIdsForProject.has(a.id));
  }, [advisors, allowedAdvisorIdsForProject]);

  // keep selections consistent when filters change
  useEffect(() => {
    if (
      selectedPlotId &&
      allowedProjectIdsForAdvisor &&
      selectedProjectId &&
      !allowedProjectIdsForAdvisor.has(selectedProjectId)
    ) {
      form.setValue("plot_id", "");
    }
  }, [allowedProjectIdsForAdvisor, form, selectedPlotId, selectedProjectId]);

  useEffect(() => {
    if (
      selectedAdvisorId &&
      allowedAdvisorIdsForProject &&
      !allowedAdvisorIdsForProject.has(selectedAdvisorId)
    ) {
      form.setValue("advisor_id", "");
    }
  }, [allowedAdvisorIdsForProject, form, selectedAdvisorId]);

  useEffect(() => {
    if (soldByAdmin) form.setValue("advisor_id", null);
  }, [soldByAdmin, form]);

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

  // Auto-compute monthly_emi from emi_months when remaining > 0
  useEffect(() => {
    if (selectedPhase === "full_payment") {
      form.setValue("emi_months", null);
      form.setValue("monthly_emi", null);
      form.setValue("emi_day", null);
      return;
    }
    const months = Number(emiMonths);
    if (months >= 1 && remaining > 0) {
      const computed = Math.ceil(remaining / months);
      form.setValue("monthly_emi", computed);
    }
  }, [emiMonths, remaining, form, selectedPhase]);

  // Full payment phase = collect everything now, hide EMI fields.
  useEffect(() => {
    if (selectedPhase !== "full_payment") return;
    const total = Number(form.getValues("total_sale_amount") ?? 0);
    if (total > 0) {
      form.setValue("down_payment", total);
    }
    form.setValue("emi_months", null);
    form.setValue("monthly_emi", null);
    form.setValue("emi_day", null);
    form.setValue("followup_date", "");
  }, [selectedPhase, form, totalSaleAmount]);

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

  const assignedFaceRatePerSqft = (() => {
    if (soldByAdmin && selectedPlot) return plotBaseRatePerSqft;
    if (!advisorAssignment) return 0;
    return Number((advisorAssignment as any).commission_rate ?? 0);
  })();

  const advisorRateInvalid =
    !soldByAdmin &&
    !!selectedPlot &&
    assignedFaceRatePerSqft > 0 &&
    plotBaseRatePerSqft > 0 &&
    assignedFaceRatePerSqft < plotBaseRatePerSqft;

  const receivedNow = Number(downPayment ?? 0);
  const finance = useMemo(() => {
    const safeZero = {
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

    if (plotSize <= 0) return safeZero;
    if (plotBaseRatePerSqft <= 0) return safeZero;
    const rate = soldByAdmin ? plotBaseRatePerSqft : assignedFaceRatePerSqft;
    if (rate <= 0) return safeZero;
    if (!soldByAdmin && rate < plotBaseRatePerSqft) return safeZero;
    if (receivedNow < 0) return safeZero;

    try {
      return calculateFinance({
        plotSizeSqft: plotSize,
        baseRatePerSqft: plotBaseRatePerSqft,
        advisorRatePerSqft: rate,
        downPayment: receivedNow,
        otherPayments: 0,
      });
    } catch {
      return safeZero;
    }
  }, [assignedFaceRatePerSqft, plotSize, plotBaseRatePerSqft, receivedNow, soldByAdmin]);

  // Auto-fill selling price when plot/advisor/phase changes
  useEffect(() => {
    if (!selectedPlotId) return;
    if (plotSize <= 0) return;
    const rate = soldByAdmin ? plotBaseRatePerSqft : assignedFaceRatePerSqft;
    if (rate <= 0) return;
    if (!soldByAdmin && !selectedAdvisorId) return;
    const selling = calculateFinance({
      plotSizeSqft: plotSize,
      baseRatePerSqft: plotBaseRatePerSqft,
      advisorRatePerSqft: rate,
      downPayment: 0,
      otherPayments: 0,
    }).sellingPrice;
    if (selling > 0) form.setValue("total_sale_amount", selling);
  }, [
    assignedFaceRatePerSqft,
    form,
    plotSize,
    plotBaseRatePerSqft,
    selectedAdvisorId,
    selectedPlotId,
    soldByAdmin,
  ]);

  const fillMockData = () => {
    if (plots.length === 0 || customers.length === 0 || advisors.length === 0) {
      toast.error("Need at least one plot, customer, and advisor to fill mock data");
      return;
    }

    const randomPlot = plots[Math.floor(Math.random() * plots.length)];
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomAdvisor = advisors[Math.floor(Math.random() * advisors.length)];

    const randomAssignment =
      (advisorAssignments ?? []).find(
        (a) => a.advisor_id === randomAdvisor.id && a.project_id === (randomPlot.project_id ?? randomPlot.projects?.id)
      ) ?? null;
    const randomAdvisorRate = Number((randomAssignment as any)?.commission_rate ?? 0);
    const selling = calculateFinance({
      plotSizeSqft: Number(randomPlot.size_sqft ?? 0),
      baseRatePerSqft: Number(randomPlot.rate_per_sqft ?? 0),
      advisorRatePerSqft: randomAdvisorRate,
      downPayment: 0,
      otherPayments: 0,
    }).sellingPrice;

    form.reset({
      plot_id: randomPlot.id,
      customer_id: randomCustomer.id,
      sold_by_admin: false,
      advisor_id: randomAdvisor.id,
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      total_sale_amount: selling || undefined,
      down_payment: selling ? Math.floor(selling * 0.1) : undefined,
      emi_months: 12,
      monthly_emi: selling ? Math.floor((selling * 0.9) / 12) : undefined,
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
      } else {
        setShareModal(null);
      }
    } catch (err) {
      toast.error("Something went wrong");
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
        <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
          Fill Mock Data
        </Button>
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
                          <SelectTrigger>
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
                          <SelectTrigger>
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
                              <SelectValue placeholder="Choose channel partner" />
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
                            <SelectItem value="token">Token / Booking</SelectItem>
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
                
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="total_sale_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price (Auto)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            disabled
                            onChange={(e) => {
                              const raw = e.target.value;
                              const sanitized = raw.replace(/^0+(?=\d)/, "");
                              field.onChange(sanitized === "" ? undefined : Number(sanitized));
                            }}
                          />
                        </FormControl>
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
                            ? "Amount received (full payment)"
                            : "Down Payment"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            disabled={selectedPhase === "full_payment"}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const sanitized = raw.replace(/^0+(?=\d)/, "");
                              field.onChange(sanitized === "" ? undefined : Number(sanitized));
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
                          {formatCurrencyShort(assignedFaceRatePerSqft)}/sqft
                        </div>
                        {advisorRateInvalid ? (
                          <div className="text-[11px] text-red-600 text-right">
                            Must be ≥ base rate
                          </div>
                        ) : null}
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Selling Price (Total)
                        </div>
                        <div className="font-bold text-zinc-900">
                          {formatCurrency(finance.sellingPrice)}
                        </div>
                      </div>

                      {!soldByAdmin && (
                        <>
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                              Total Profit
                            </div>
                            <div className="font-semibold text-zinc-900">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedPhase !== "full_payment" && remaining > 0 && (
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
                                const v = e.target.value;
                                field.onChange(v === "" ? undefined : Number(v));
                              }}
                            />
                          </FormControl>
                          <p className="text-[11px] text-zinc-500">Auto-fills monthly EMI</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {selectedPhase !== "full_payment" && (
                    <FormField
                      control={form.control}
                      name="monthly_emi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly EMI</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const sanitized = raw.replace(/^0+(?=\d)/, "");
                                field.onChange(sanitized === "" ? undefined : Number(sanitized));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {selectedPhase !== "full_payment" && (
                    <FormField
                      control={form.control}
                      name="emi_day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EMI Day (1-31)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const sanitized = raw.replace(/^0+(?=\d)/, "");
                                field.onChange(
                                  sanitized === "" ? undefined : Number(sanitized)
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                {selectedPhase === "full_payment" ? (
                  <p className="text-[11px] text-zinc-500">
                    EMI fields are hidden when the sale is recorded as full payment.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
              <Button
                type="submit"
                disabled={loading || advisorRateInvalid}
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
