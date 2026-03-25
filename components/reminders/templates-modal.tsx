"use client";

import { useState } from "react";
import { FileText, ChevronRight, Sparkles, Check } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui";
import { Button } from "@/components/ui";
import {
	REMINDER_TEMPLATES,
	getStoredTemplateId,
	setStoredTemplateId,
	type ReminderType,
	type MessageTemplate,
} from "@/lib/reminder-templates";
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

export function TemplatesModal() {
	const [open, setOpen] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
	const [selectedGroupType, setSelectedGroupType] = useState<ReminderType | null>(null);

	const handleSelectTemplate = (groupType: ReminderType, template: MessageTemplate) => {
		setStoredTemplateId(groupType, template.id);
		setSelectedTemplate(template);
		setSelectedGroupType(groupType);
	};

	const isTemplateSelected = (groupType: ReminderType, templateId: string) =>
		getStoredTemplateId(groupType) === templateId;

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				className="h-9 text-xs font-medium gap-2 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
			>
				<FileText className="h-4 w-4" />
				Change Templates
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl flex-col gap-0 overflow-hidden border-border p-0 shadow-xl sm:rounded-xl">
					<DialogHeader className="shrink-0 border-b border-border bg-gradient-to-b from-muted/60 to-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="flex items-center justify-between gap-3 text-lg font-semibold">
							<div className="flex items-center gap-2 min-w-0">
								<Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
								<span className="truncate">Message Templates</span>
							</div>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
								Close
							</Button>
						</DialogTitle>
						<DialogDescription>
							Choose a template for each reminder type. Dynamic fields like [name], [date] will be filled when sending.
						</DialogDescription>
					</DialogHeader>

					<div className="min-h-0 flex-1 overflow-hidden flex flex-col md:flex-row">
						{/* Template list */}
						<div className="flex-1 overflow-y-auto border-b md:border-b-0 md:border-r border-zinc-100 p-4 min-h-[200px] md:min-h-0">
							<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
								{REMINDER_TEMPLATES.map((group) => (
									<div key={group.type} className="space-y-2">
										<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
											{group.label}
										</p>
										<div className="space-y-1">
											{group.templates.map((tpl) => {
												const isSelected = isTemplateSelected(group.type, tpl.id);
												const isPreview = selectedTemplate?.id === tpl.id && selectedGroupType === group.type;
												return (
													<button
														key={tpl.id}
														type="button"
														onClick={() => handleSelectTemplate(group.type, tpl)}
														className={cn(
															"w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200",
															isPreview
																? "border-blue-300 bg-blue-50/50 shadow-sm ring-1 ring-blue-200/50"
																: "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50",
															isSelected && !isPreview && "border-emerald-200 bg-emerald-50/30"
														)}
													>
														<div className="flex items-center justify-between gap-2">
															<span className="text-sm font-medium text-zinc-800 truncate">
																{tpl.name}
															</span>
															{isSelected ? (
																<Check className="h-4 w-4 text-emerald-600 shrink-0" />
															) : (
																<ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
															)}
														</div>
													</button>
												);
											})}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Preview panel */}
						<div className="flex-1 flex flex-col min-h-[220px] md:min-h-0 bg-zinc-50/50">
							{selectedTemplate ? (
								<>
									<div className="p-3 border-b border-zinc-100 bg-white/80">
										<p className="text-xs font-semibold text-zinc-600">
											Preview — {selectedTemplate.name}
										</p>
										<p className="text-[10px] text-zinc-400 mt-0.5">
											Fields in brackets are replaced when sending
										</p>
									</div>
									<div className="flex-1 overflow-y-auto p-4">
										<div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed font-mono bg-white rounded-lg border border-zinc-100 p-4 shadow-sm">
											{highlightPlaceholders(selectedTemplate.body).map((part, i) =>
												part.isPlaceholder ? (
													<span
														key={i}
														className="inline font-semibold text-blue-600 bg-blue-50 px-1 rounded"
													>
														{part.text}
													</span>
												) : (
													<span key={i}>{part.text}</span>
												)
											)}
										</div>
									</div>
								</>
							) : (
								<div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
									<FileText className="h-12 w-12 text-zinc-200 mb-3" />
									<p className="text-sm font-medium text-zinc-500">
										Select a template to preview
									</p>
									<p className="text-xs text-zinc-400 mt-1">
										Click any template on the left to see the message
									</p>
								</div>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
