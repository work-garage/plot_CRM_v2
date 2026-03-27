"use client";

import { useModules } from "@/components/providers/module-context";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Button,
	Switch,
} from "@/components/ui";
import { 
	Handshake, 
	CreditCard, 
	Banknote, 
	Receipt, 
	BarChart3,
	Settings2
} from "lucide-react";
import { ModuleSettings } from "@/app/actions/settings";

export function AddSectionsModal({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { modules, toggleModule, isUpdating } = useModules();

	const moduleList: Array<{ key: keyof ModuleSettings; label: string; icon: any; description: string }> = [
		{ 
			key: "sales", 
			label: "Sales Management", 
			icon: Handshake, 
			description: "Track plot sales, phases, and conversion data." 
		},
		{ 
			key: "payments", 
			label: "Payments & EMI", 
			icon: CreditCard, 
			description: "Manage customer payments, installments, and receipts." 
		},
		{ 
			key: "commissions", 
			label: "Advisor Commissions", 
			icon: Banknote, 
			description: "Calculate and track channel advisor commissions." 
		},
		{ 
			key: "expenses", 
			label: "Office Expenses", 
			icon: Receipt, 
			description: "Manage project-wise and general office expenditure." 
		},
		{ 
			key: "reports", 
			label: "Advanced Reports", 
			icon: BarChart3, 
			description: "Generate deep analytics and performance reports." 
		},
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Settings2 className="h-5 w-5 text-primary" />
						Enable Sections / Modules
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<p className="text-sm text-zinc-500 mb-2">
						Toggle the sections you want to add to your CRM dashboard. Disabling a section hides all related data.
					</p>

					{moduleList.map((m) => (
						<div 
							key={m.key} 
							className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-600">
									<m.icon className="h-5 w-5" />
								</div>
								<div>
									<div className="text-sm font-semibold text-zinc-900">{m.label}</div>
									<div className="text-[11px] text-zinc-500 max-w-[200px] leading-tight mt-0.5">
										{m.description}
									</div>
								</div>
							</div>
							<Switch 
								checked={modules[m.key]} 
								onCheckedChange={(checked) => toggleModule(m.key, checked)}
								disabled={isUpdating}
								className="border-zinc-900/20"
							/>
						</div>
					))}
				</div>

				<div className="flex justify-end pt-2">
					<Button onClick={() => onOpenChange(false)}>
						Done
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
