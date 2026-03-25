"use client";

import { useState } from "react";
import { FileText, Sparkles, Check } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	Button,
} from "@/components/ui";
import {
	PAYMENT_MESSAGE_TEMPLATES,
	getStoredPaymentTemplateId,
	setStoredPaymentTemplateId,
	type PaymentTemplateId,
	type PaymentMessageTemplate,
} from "@/lib/payment-message-templates";
import { cn } from "@/lib/utils";

function highlightPlaceholders(text: string) {
	const parts: { text: string; isPlaceholder: boolean }[] = [];
	const regex = /\[([^\]]+)\]/g;
	let lastIndex = 0;
	let match;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push({ text: text.slice(lastIndex, match.index), isPlaceholder: false });
		}
		parts.push({ text: match[0], isPlaceholder: true });
		lastIndex = match.index + match[0].length;
	}
	if (lastIndex < text.length) {
		parts.push({ text: text.slice(lastIndex), isPlaceholder: false });
	}
	return parts;
}

export function PaymentTemplatesModal() {
	const [open, setOpen] = useState(false);

	const handleSelect = (t: PaymentMessageTemplate) => {
		setStoredPaymentTemplateId(t.id as PaymentTemplateId);
	};

	const currentId = getStoredPaymentTemplateId();

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				className="h-9 text-xs font-medium gap-2 border-zinc-200"
			>
				<FileText className="h-4 w-4" />
				Payment messages
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
					<DialogHeader className="shrink-0 border-b p-4 sm:p-5 text-left">
						<DialogTitle className="flex items-center gap-2 text-lg font-semibold">
							<Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
							Payment WhatsApp templates
						</DialogTitle>
						<DialogDescription>
							Used when you tap &quot;Remind&quot; on Payments or Sales. Placeholders:{" "}
							<code className="text-xs">[name]</code>, <code className="text-xs">[plot]</code>,{" "}
							<code className="text-xs">[project]</code>, <code className="text-xs">[remaining]</code>,{" "}
							<code className="text-xs">[emi_amount]</code>, <code className="text-xs">[due_date]</code>.
						</DialogDescription>
					</DialogHeader>

					<div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
						{PAYMENT_MESSAGE_TEMPLATES.map((t) => {
							const isSel = currentId === t.id;
							return (
								<button
									key={t.id}
									type="button"
									onClick={() => handleSelect(t)}
									className={cn(
										"w-full rounded-lg border p-4 text-left transition-colors",
										isSel
											? "border-zinc-900 bg-zinc-50"
											: "border-zinc-200 hover:border-zinc-300"
									)}
								>
									<div className="flex items-center justify-between gap-2 mb-2">
										<span className="font-semibold text-sm">{t.label}</span>
										{isSel && (
											<span className="flex items-center gap-1 text-xs text-green-600 font-medium">
												<Check className="h-3.5 w-3.5" /> Default
											</span>
										)}
									</div>
									<p className="text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed">
										{highlightPlaceholders(t.body).map((part, i) => (
											<span
												key={i}
												className={part.isPlaceholder ? "text-amber-700 font-medium" : ""}
											>
												{part.text}
											</span>
										))}
									</p>
								</button>
							);
						})}
					</div>

					<div className="shrink-0 border-t p-4 flex justify-end">
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Close
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
