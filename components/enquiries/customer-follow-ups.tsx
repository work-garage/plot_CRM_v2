"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, MessageSquare, PhoneCall, MapPin, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Card, CardContent } from "@/components/ui";
import { getCustomerFollowUps, addFollowUp, type FollowUpPayload } from "@/app/actions/follow_ups";
import { deriveTaskStatus } from "@/lib/crm-utils";
import { cn } from "@/lib/utils";

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

    useEffect(() => {
        if (!customerId) return;
        load();
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
                next_follow_up_date: form.next_follow_up_date || null
            });
            if (res.success) {
                toast.success("Follow-up logged successfully");
                setShowForm(false);
                setForm({
                    whatsapp_done: false, call_done: false, site_visit_done: false,
                    customer_mood: "Interested", notes: "",
                    follow_up_date: new Date().toISOString().slice(0, 10),
                    next_follow_up_date: "",
                });
                await load();
            } else {
                toast.error(res.error || "Failed to save");
            }
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 text-zinc-400 animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Interaction History</h3>
                {!showForm && (
                    <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Log Follow-up
                    </Button>
                )}
            </div>

            {showForm && (
                <Card className="border-blue-100 bg-blue-50/30">
                    <CardContent className="p-4 space-y-4">
                        {/* Interaction types */}
                        <div className="flex gap-4">
                            {[
                                { key: "whatsapp_done", label: "WhatsApp", Icon: MessageSquare, color: "text-green-600" },
                                { key: "call_done", label: "Call", Icon: PhoneCall, color: "text-blue-600" },
                                { key: "site_visit_done", label: "Site Visit", Icon: MapPin, color: "text-red-600" },
                            ].map(({ key, label, Icon, color }) => (
                                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={(form as any)[key]}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <Icon className={`h-4 w-4 ${color}`} /> {label}
                                </label>
                            ))}
                        </div>

                        {/* Derived Task Status preview */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 font-semibold uppercase">Task Status:</span>
                            {form.whatsapp_done && form.call_done && form.site_visit_done ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-semibold">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 font-semibold">
                                    <Clock className="h-3.5 w-3.5" /> Pending
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase text-zinc-500">Follow-up Date</div>
                                <Input type="date" value={form.follow_up_date || ""} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase text-zinc-500">
									{form.whatsapp_done && form.call_done
										? "📅 Site Visit Date"
										: "Next Follow-up Date"}
                                </div>
                                <Input type="date" value={form.next_follow_up_date || ""} onChange={e => setForm(f => ({ ...f, next_follow_up_date: e.target.value }))} />
								{form.whatsapp_done && form.call_done && (
									<p className="text-xs text-orange-600 mt-0.5">
										Setting this date: lead → "Contact Done — Site Visit Pending"
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
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase text-zinc-500">Customer Mood</div>
                            <div className="flex gap-2">
                                {["Interested", "Neutral", "Not Interested"].map(mood => (
                                    <button
                                        key={mood}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, customer_mood: mood }))}
                                        className={cn(
                                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                            form.customer_mood === mood
                                                ? mood === "Not Interested" ? "bg-red-600 text-white border-red-600"
                                                    : mood === "Interested" ? "bg-green-600 text-white border-green-600"
                                                        : "bg-zinc-800 text-white border-zinc-800"
                                                : "bg-white text-zinc-600 hover:bg-zinc-50"
                                        )}
                                    >
                                        {mood}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSubmit} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Interaction"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {followUps.length === 0 && !showForm ? (
                <div className="text-center py-6 text-sm text-zinc-500 border border-dashed rounded-lg bg-zinc-50/50">
                    No follow-ups recorded yet. Click "Log Follow-up" to start tracking.
                </div>
            ) : (
                <div className="space-y-3">
                    {followUps.map(f => (
                        <div key={f.id} className="border rounded-lg p-3 text-sm bg-white shadow-sm space-y-2">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-2 items-center flex-wrap">
                                    {f.whatsapp_done && <MessageSquare className="h-4 w-4 text-green-600" aria-label="WhatsApp" />}
                                    {f.call_done && <PhoneCall className="h-4 w-4 text-blue-600" aria-label="Call" />}
                                    {f.site_visit_done && <MapPin className="h-4 w-4 text-red-600" aria-label="Site Visit" />}
                                    {/* Task Status badge */}
                                    {f.task_status === "Completed" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 text-xs font-semibold">
                                            <CheckCircle2 className="h-3 w-3" /> Completed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 text-xs font-semibold">
                                            <Clock className="h-3 w-3" /> Pending
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-zinc-500 font-medium">
                                    {f.follow_up_date ? format(new Date(f.follow_up_date), "MMM d, yyyy") : "Unknown"}
                                </span>
                            </div>
                            <p className="text-zinc-700">{f.notes || "No notes provided."}</p>
                            <div className="flex items-center gap-3 pt-2 text-xs text-zinc-500 border-t mt-2 flex-wrap">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full border font-medium",
                                    f.customer_mood === "Interested" ? "text-green-700 border-green-200 bg-green-50" :
                                    f.customer_mood === "Not Interested" ? "text-red-700 border-red-200 bg-red-50" :
                                    "text-zinc-600 border-zinc-200 bg-zinc-50"
                                )}>
                                    {f.customer_mood || "Neutral"}
                                </span>
                                {f.next_follow_up_date && (
                                    <span>Next: <span className="font-semibold text-zinc-700">{format(new Date(f.next_follow_up_date), "MMM d, yyyy")}</span></span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
