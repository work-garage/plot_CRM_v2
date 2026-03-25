"use client";

import { useEffect, useState } from "react";
import { X, SkipForward, Plane } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";
import { fillTemplate, getTemplateForType, type ReminderType } from "@/lib/reminder-templates";
import type { MessagingPerson } from "@/app/actions/messaging-directory";

function reminderTypeForRole(role: MessagingPerson["role"]): ReminderType {
	if (role === "advisor") return "birthday_advisor";
	return "birthday_customer";
}

function buildMessage(person: MessagingPerson, templateBody: string): string {
	return fillTemplate(templateBody, {
		name: person.name,
		date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" }),
	});
}

function openWhatsApp(phone: string | null, text: string) {
	if (!phone) return;
	const formatted = phone.replace(/\D/g, "").replace(/^0/, "");
	const wa = formatted.startsWith("91") ? formatted : `91${formatted}`;
	window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, "_blank");
}

export function BulkSendModal({
	open,
	onOpenChange,
	queue,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	queue: MessagingPerson[];
}) {
	const [idx, setIdx] = useState(0);
	const [sent, setSent] = useState(0);
	const [skipped, setSkipped] = useState(0);

	useEffect(() => {
		if (!open) {
			setIdx(0);
			setSent(0);
			setSkipped(0);
		}
	}, [open]);

	const current = queue[idx] ?? null;
	const template = current ? getTemplateForType(reminderTypeForRole(current.role)) : null;
	const message = current && template ? buildMessage(current, template.body) : "";

	const pendingCount = current ? queue.length - idx : 0;
	const progressPct = queue.length ? Math.min(100, (idx / queue.length) * 100) : 0;

	const handleSkip = () => {
		if (!current) return;
		setSkipped((s) => s + 1);
		setIdx((i) => i + 1);
	};

	const handleSendNext = () => {
		if (!current || !template) return;
		if (!current.phone) {
			setSkipped((s) => s + 1);
			setIdx((i) => i + 1);
			return;
		}
		openWhatsApp(current.phone, message);
		setSent((s) => s + 1);
		setIdx((i) => i + 1);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-xl">
				<DialogHeader className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
					<DialogTitle className="text-base font-semibold">Bulk send — birthday messages</DialogTitle>
				</DialogHeader>

				<div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800">
					<div
						className="h-full bg-emerald-500 transition-all duration-300"
						style={{ width: `${progressPct}%` }}
					/>
				</div>

				<div className="grid grid-cols-3 gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
					<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
						<p className="text-[10px] font-semibold uppercase text-emerald-800 dark:text-emerald-200">Sent</p>
						<p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{sent}</p>
					</div>
					<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center dark:border-amber-900 dark:bg-amber-950/40">
						<p className="text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-200">Pending</p>
						<p className="text-lg font-bold text-amber-700 dark:text-amber-300">{pendingCount}</p>
					</div>
					<div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
						<p className="text-[10px] font-semibold uppercase text-zinc-600">Skipped</p>
						<p className="text-lg font-bold text-zinc-700 dark:text-zinc-200">{skipped}</p>
					</div>
				</div>

				<div className="max-h-[min(55vh,420px)] space-y-3 overflow-y-auto px-4 py-4">
					{!current ? (
						<p className="text-center text-sm text-muted-foreground py-8">Done — everyone in this queue was processed.</p>
					) : (
						<>
							<div className="flex items-start gap-3">
								<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-semibold text-white">
									{current.name.charAt(0).toUpperCase()}
								</div>
								<div className="min-w-0 flex-1">
									<p className="font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
										{current.name}
									</p>
									<p className="text-xs text-muted-foreground font-mono">{current.phone ?? "No phone"}</p>
									<span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium capitalize text-zinc-700 dark:bg-zinc-800">
										{current.role}
									</span>
								</div>
							</div>
							<div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-sm leading-relaxed text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-50 whitespace-pre-wrap">
								{message}
							</div>
							{!current.phone && (
								<p className="text-xs text-amber-700 dark:text-amber-300">No phone on file — will count as skip.</p>
							)}
						</>
					)}
				</div>

				<div className="space-y-2 border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							className="flex-1 min-w-[120px]"
							disabled={!current}
							onClick={handleSkip}
						>
							<SkipForward className="mr-2 h-4 w-4" />
							Skip
						</Button>
						<Button
							type="button"
							className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-700"
							disabled={!current}
							onClick={handleSendNext}
						>
							<Plane className="mr-2 h-4 w-4" />
							Send &amp; next
						</Button>
					</div>
					<Button
						type="button"
						variant="outline"
						className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
						onClick={() => onOpenChange(false)}
					>
						<X className="mr-2 h-4 w-4" />
						Exit bulk send
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
