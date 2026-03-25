"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, CreditCard } from "lucide-react";
import { Button } from "@/components/ui";
import { EmiModal } from "./emi-modal";
import { PaymentTemplatesModal } from "./payment-templates-modal";

export function PaymentsPageActions() {
	const [emiOpen, setEmiOpen] = useState(false);
	return (
		<div className="flex flex-wrap items-center gap-2">
			<PaymentTemplatesModal />
			<Button
				size="sm"
				variant="outline"
				onClick={() => setEmiOpen(true)}
				className="gap-2"
			>
				<CreditCard className="h-4 w-4" />
				EMI
			</Button>
			<Link href="/payments/new">
				<Button size="sm" className="gap-2">
					<Plus className="h-4 w-4" />
					Record Payment
				</Button>
			</Link>
			<EmiModal open={emiOpen} onOpenChange={setEmiOpen} />
		</div>
	);
}
