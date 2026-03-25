"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui";
import { getTemplateForType, fillTemplate } from "@/lib/reminder-templates";
import { toast } from "sonner";

interface BirthdayCardProps {
	id: string;
	name: string;
	phone: string | null;
	role: "customer" | "advisor";
}

export function BirthdayCard({ id, name, phone, role }: BirthdayCardProps) {
	const handleSendWish = () => {
		if (!phone) {
			toast.error("No phone number for this person");
			return;
		}
		const type = role === "customer" ? "birthday_customer" : "birthday_advisor";
		const template = getTemplateForType(type);
		if (!template) {
			toast.error("No template found");
			return;
		}
		const message = fillTemplate(template.body, {
			name,
			date: new Date().toLocaleDateString("en-IN", {
				day: "numeric",
				month: "long",
			}),
		});
		const formattedPhone = phone.replace(/\D/g, "").replace(/^0/, "");
		const waPhone = formattedPhone.startsWith("91") ? formattedPhone : `91${formattedPhone}`;
		const encodedMessage = encodeURIComponent(message);
		window.open(`https://wa.me/${waPhone}?text=${encodedMessage}`, "_blank");
	};

	return (
		<div
			className={`
				flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-4 shadow-sm
				${role === "customer" ? "border-rose-100 bg-white/80" : "border-amber-100 bg-white/80"}
			`}
		>
			<div
				className={`
					flex h-12 w-12 shrink-0 items-center justify-center rounded-full
					${role === "customer" ? "bg-rose-200/60" : "bg-amber-200/60"}
				`}
			>
				<span className="text-lg font-bold text-zinc-600">
					{name.charAt(0).toUpperCase()}
				</span>
			</div>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-zinc-900 truncate">{name}</p>
				<p className="text-xs text-zinc-500 capitalize">{role}</p>
				{phone && <p className="text-xs text-zinc-600 mt-0.5">{phone}</p>}
			</div>
			{phone && (
				<Button
					size="sm"
					variant="outline"
					className="shrink-0 h-9 text-xs font-semibold gap-2 text-green-600 border-green-200 hover:bg-green-50"
					onClick={handleSendWish}
				>
					<MessageSquare className="h-4 w-4" />
					Send Wish
				</Button>
			)}
		</div>
	);
}
