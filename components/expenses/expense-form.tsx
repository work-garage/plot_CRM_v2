"use client";

import { useState } from "react";
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
import { expenseSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import { createExpense } from "@/app/actions/expenses";
import { ReceiptUpload } from "@/components/shared/receipt-upload";

export function ExpenseForm({
  projects = [],
}: {
  projects?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [draftId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      description: "",
      amount: undefined as any,
      paid_amount: undefined as any,
      expense_date: new Date().toISOString().split('T')[0],
      payment_type: "cash",
      category: "misc",
      project_id: null,
      receipt_note: "",
      receipt_path: "",
    },
  });

  const fillMockData = () => {
    const descriptions = [
      "Office tea and snacks",
      "Nagpur Metro advertising",
      "Wardha Road site visit fuel",
      "Office electricity bill",
      "Printing of project brochures",
      "Cleaning staff salary",
    ];
    const categories: any[] = ["office", "marketing", "travel", "utilities", "maintenance", "salary"];
    const randomProject = projects.length
      ? projects[Math.floor(Math.random() * projects.length)]
      : null;
    const randomIndex = Math.floor(Math.random() * descriptions.length);
    const amount = Math.floor(Math.random() * 5000) + 200;

    form.reset({
      description: descriptions[randomIndex],
      amount,
      paid_amount: amount,
      expense_date: new Date().toISOString().split('T')[0],
      payment_type: "cash",
      category: categories[randomIndex],
      project_id: randomProject?.id ?? null,
      receipt_note: `Receipt #${Math.floor(Math.random() * 10000)}`,
    });
  };

  const playSubmitTone = (kind: "success" | "error") => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = kind === "success" ? 740 : 220;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "success" ? 0.2 : 0.15));
      osc.start(now);
      osc.stop(now + (kind === "success" ? 0.22 : 0.17));
      setTimeout(() => void ctx.close(), 300);
    } catch {}
  };

  async function onSubmit(values: ExpenseFormValues) {
    setLoading(true);
    setSubmitStatus("idle");
    setStatusText("");
    try {
      const result = await createExpense(values);
      if (!result.success) {
        toast.error("Error", { description: result.error });
        setSubmitStatus("error");
        setStatusText(result.error ?? "Failed to record expense");
        playSubmitTone("error");
        return;
      }

      toast.success("Expense recorded successfully");
      setSubmitStatus("success");
      setStatusText("Expense recorded successfully.");
      playSubmitTone("success");
      router.push("/expenses");
      router.refresh();
    } catch (err) {
      toast.error("Something went wrong");
      setSubmitStatus("error");
      setStatusText("Something went wrong while saving expense.");
      playSubmitTone("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>Record office or site related expenses</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
          Fill Mock Data
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Input placeholder="What was this expense for?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
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
              <FormField
                control={form.control}
                name="paid_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Amount (₹) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
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
              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="office">Office / Maintenance</SelectItem>
                      <SelectItem value="marketing">Marketing / Ads</SelectItem>
                      <SelectItem value="travel">Travel / Site Visits</SelectItem>
                      <SelectItem value="layout_dev">Layout Development</SelectItem>
                      <SelectItem value="legal">Legal / Registry</SelectItem>
                      <SelectItem value="salary">Staff Salary</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="misc">Miscellaneous</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project (optional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    value={field.value ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Link to a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
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
              name="receipt_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Note</FormLabel>
                  <FormControl><Input placeholder="Bill number or reference" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receipt_path"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ReceiptUpload
                      folder="expenses"
                      recordId={draftId}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading} className={`min-w-[120px] transition-all duration-300 ${loading ? "scale-[1.02] shadow-md" : ""}`}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Submitting..." : "Record Expense"}
              </Button>
            </div>
            {submitStatus !== "idle" && (
              <div className={`mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs animate-in fade-in zoom-in-95 duration-300 ${
                submitStatus === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
                {submitStatus === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{statusText}</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
