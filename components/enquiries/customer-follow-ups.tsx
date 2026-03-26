"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Loader2,
  Plus,
  MessageSquare,
  PhoneCall,
  MapPin,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Card, CardContent } from "@/components/ui";
import { getCustomerFollowUps, addFollowUp, type FollowUpPayload } from "@/app/actions/follow_ups";
import { cn } from "@/lib/utils";

const INTERACTIONS = [
  { key: "whatsapp_done", label: "WhatsApp", Icon: MessageSquare, color: "text-green-600" },
  { key: "call_done", label: "Call", Icon: PhoneCall, color: "text-blue-600" },
  { key: "site_visit_done", label: "Site Visit", Icon: MapPin, color: "text-red-600" },
] as const;

function getCumulativeState(logs: any[]) {
  return {
    whatsapp_done: logs.some((row) => row.whatsapp_done),
    call_done: logs.some((row) => row.call_done),
    site_visit_done: logs.some((row) => row.site_visit_done),
  };
}

export function CustomerFollowUps({ customerId }: { customerId: string }) {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<FollowUpPayload>({
    whatsapp_done: false,
    call_done: false,
    site_visit_done: false,
    customer_mood: "Interested",
    notes: "",
    follow_up_date: new Date().toISOString().slice(0, 10),
    next_follow_up_date: "",
  });

  const cumulativeState = useMemo(() => getCumulativeState(followUps), [followUps]);

  function openForm() {
    setForm({
      ...cumulativeState,
      customer_mood: "Interested",
      notes: "",
      follow_up_date: new Date().toISOString().slice(0, 10),
      next_follow_up_date: "",
    });
    setShowForm(true);
  }

  useEffect(() => {
    if (!customerId) return;
    void load();
  }, [customerId]);

  async function load() {
    setLoading(true);
    try {
      const data = await getCustomerFollowUps(customerId);
      setFollowUps(data);
    } catch {
      toast.error("Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.notes?.trim() && !form.whatsapp_done && !form.call_done && !form.site_visit_done) {
      toast.error("Please enter notes or check at least one interaction type.");
      return;
    }

    setSaving(true);
    try {
      const res = await addFollowUp(customerId, {
        ...form,
        next_follow_up_date: form.next_follow_up_date || null,
      });
      if (res.success) {
        toast.success("Follow-up logged successfully");
        setShowForm(false);
        await load();
      } else {
        toast.error(res.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Interaction History</h3>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={openForm}>
            <Plus className="mr-1 h-4 w-4" /> Log Follow-up
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {INTERACTIONS.map(({ key, label, Icon, color }) => {
                const alreadyCompleted = Boolean(cumulativeState[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (alreadyCompleted) return;
                      setForm((prev) => ({ ...prev, [key]: !(prev as any)[key] }));
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                      alreadyCompleted
                        ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-800"
                        : (form as any)[key]
                        ? "border-blue-300 bg-blue-50 text-blue-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                    )}
                  >
                    {alreadyCompleted ? <Lock className="h-4 w-4" /> : <Icon className={`h-4 w-4 ${color}`} />}
                    <span className="font-medium">{label}</span>
                    {alreadyCompleted && <span className="ml-auto text-[11px] font-semibold uppercase">Done</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold uppercase text-zinc-500">Task Status:</span>
              {form.whatsapp_done && form.call_done && form.site_visit_done ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 font-semibold text-yellow-700">
                  <Clock className="h-3.5 w-3.5" /> Pending
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase text-zinc-500">Follow-up Date</div>
                <Input
                  type="date"
                  value={form.follow_up_date || ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, follow_up_date: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase text-zinc-500">
                  {form.whatsapp_done && form.call_done ? "Site Visit Date" : "Next Follow-up Date"}
                </div>
                <Input
                  type="date"
                  value={form.next_follow_up_date || ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, next_follow_up_date: event.target.value }))}
                />
                {form.whatsapp_done && form.call_done && (
                  <p className="mt-0.5 text-xs text-orange-600">
                    Scheduling this date keeps the lead in contact-done / site-visit-pending state.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase text-zinc-500">Notes</div>
              <Textarea
                rows={2}
                placeholder="What did the customer say? Any objections?"
                value={form.notes || ""}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase text-zinc-500">Customer Mood</div>
              <div className="flex gap-2">
                {["Interested", "Neutral", "Not Interested"].map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, customer_mood: mood }))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      form.customer_mood === mood
                        ? mood === "Not Interested"
                          ? "border-red-600 bg-red-600 text-white"
                          : mood === "Interested"
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-zinc-800 bg-zinc-800 text-white"
                        : "bg-white text-zinc-600 hover:bg-zinc-50",
                    )}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Interaction"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {followUps.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed bg-zinc-50/50 py-6 text-center text-sm text-zinc-500">
          No follow-ups recorded yet. Click "Log Follow-up" to start tracking.
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((followUp) => (
            <div key={followUp.id} className="space-y-2 rounded-lg border bg-white p-3 text-sm shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {followUp.whatsapp_done && <MessageSquare className="h-4 w-4 text-green-600" aria-label="WhatsApp" />}
                  {followUp.call_done && <PhoneCall className="h-4 w-4 text-blue-600" aria-label="Call" />}
                  {followUp.site_visit_done && <MapPin className="h-4 w-4 text-red-600" aria-label="Site Visit" />}
                  {followUp.task_status === "Completed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-zinc-500">
                  {followUp.follow_up_date ? format(new Date(followUp.follow_up_date), "MMM d, yyyy") : "Unknown"}
                </span>
              </div>
              <p className="text-zinc-700">{followUp.notes || "No notes provided."}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 border-t pt-2 text-xs text-zinc-500">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-medium",
                    followUp.customer_mood === "Interested"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : followUp.customer_mood === "Not Interested"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600",
                  )}
                >
                  {followUp.customer_mood || "Neutral"}
                </span>
                {followUp.next_follow_up_date && (
                  <span>
                    Next: <span className="font-semibold text-zinc-700">{format(new Date(followUp.next_follow_up_date), "MMM d, yyyy")}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
