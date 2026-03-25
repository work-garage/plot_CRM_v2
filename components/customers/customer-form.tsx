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
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer";
import { createCustomer, updateCustomer } from "@/app/actions/customers";

interface CustomerFormProps {
  mode: "create" | "edit";
  initialData?: any;
  advisors: any[];
  redirectTo?: string;
}

export function CustomerForm({
  mode,
  initialData,
  advisors,
  redirectTo = "/customers",
}: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      phone: initialData?.phone ?? "",
      alternate_phone: initialData?.alternate_phone ?? "",
      address: initialData?.address ?? "",
      birth_date: initialData?.birth_date ?? "",
      advisor_id: initialData?.advisor_id ?? null,
      route: initialData?.route ?? "",
      notes: initialData?.notes ?? "",
      is_active: initialData?.is_active ?? true,
    },
  });

  const fillMockData = () => {
    const names = ["Vijay Sharma", "Rahul Gupta", "Sunita Bai", "Ganesh Raut", "Deepak Tighare", "Manisha Kolhe"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const routes = ["Wardha Road", "Hingna", "Besa", "Manish Nagar", "Mihan", "Koradi"];
    const randomRoute = routes[Math.floor(Math.random() * routes.length)];
    
    // Pick a random advisor if available
    const randomAdvisorId = advisors.length > 0 
      ? advisors[Math.floor(Math.random() * advisors.length)].id 
      : null;

    form.reset({
      name: randomName,
      phone: `99${Math.floor(Math.random() * 90000000) + 10000000}`,
      alternate_phone: `88${Math.floor(Math.random() * 90000000) + 10000000}`,
      address: `Plot No ${Math.floor(Math.random() * 500) + 1}, ${randomRoute}, Nagpur`,
      birth_date: "1990-08-20",
      advisor_id: randomAdvisorId,
      route: randomRoute,
      notes: `Interested in residential plots near ${randomRoute}. Preferred contact time: Evening.`,
      is_active: true,
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

  async function onSubmit(values: CustomerFormValues) {
    setLoading(true);
    setSubmitStatus("idle");
    setStatusText("");
    try {
      const payload = {
        ...values,
        advisor_id: values.advisor_id === "none" ? null : values.advisor_id,
      };
      let result;
      if (mode === "edit" && initialData?.id) {
        result = await updateCustomer(initialData.id, payload);
      } else {
        result = await createCustomer(payload);
      }

      if (!result.success) {
        toast.error("Error", { description: result.error });
        setSubmitStatus("error");
        setStatusText(result.error ?? "Failed to save customer");
        playSubmitTone("error");
        return;
      }

      toast.success(mode === "edit" ? "Customer updated" : "Customer created");
      setSubmitStatus("success");
      setStatusText(mode === "edit" ? "Customer updated successfully." : "Customer created successfully.");
      playSubmitTone("success");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      toast.error("Something went wrong");
      setSubmitStatus("error");
      setStatusText("Something went wrong while saving customer.");
      playSubmitTone("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-4xl w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{mode === "edit" ? "Edit Customer" : "New Customer"}</CardTitle>
          <CardDescription>Enter details for the plot buyer</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
          Fill Mock Data
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. Vijay Sharma" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 9876543210"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alternate_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternate Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 8877665544"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                control={form.control}
                name="advisor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referred By (Advisor)</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)} 
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an advisor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {advisors.map((advisor) => (
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
              <FormField
                control={form.control}
                name="route"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route / Area</FormLabel>
                    <FormControl><Input placeholder="e.g. Wardha Road" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input placeholder="Residential address" {...field} /></FormControl>
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
                  <FormControl><Textarea rows={3} placeholder="Additional requirements or details" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button
                type="submit"
                disabled={loading || (mode === "edit" && !form.formState.isDirty)}
                className={`transition-all duration-300 ${loading ? "scale-[1.02] shadow-md" : ""}`}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Submitting..." : mode === "edit" ? "Update Customer" : "Create Customer"}
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
