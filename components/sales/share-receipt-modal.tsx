"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Share2, Loader2, ExternalLink } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Button,
} from "@/components/ui";
import { generateReceipt } from "@/app/actions/receipts";

interface ShareReceiptModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	saleId: string;
	customerPhone?: string | null;
	customerName?: string | null;
	donePath?: string;
}

export function ShareReceiptModal({
	open,
	onOpenChange,
	saleId,
	customerPhone,
	customerName,
	donePath = "/sales",
}: ShareReceiptModalProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleGenerate = async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await generateReceipt(saleId);
			if (result.success && result.url) {
				setReceiptUrl(result.url);
			} else {
				setError(result.error ?? "Failed to generate receipt");
			}
		} catch (err) {
			setError("Something went wrong");
		} finally {
			setLoading(false);
		}
	};

	const handleShare = () => {
		const phone = customerPhone?.replace(/\D/g, "") ?? "";
		if (!phone) return;
		const withCode = phone.startsWith("91") ? phone : `91${phone}`;
		const name = customerName ?? "Customer";
		const msg = `Hi ${name}, please find your sale receipt: ${receiptUrl ?? ""}`;
		window.open(
			`https://wa.me/${withCode}?text=${encodeURIComponent(msg)}`,
			"_blank"
		);
	};

	const handleDone = () => {
		onOpenChange(false);
		router.push(donePath);
		router.refresh();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Share Receipt
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{error && (
						<div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
							{error}
						</div>
					)}

					{!receiptUrl ? (
						<div className="space-y-3">
							<p className="text-sm text-zinc-600">
								Generate a formal receipt for this sale. You can then share it via WhatsApp to the customer.
							</p>
							<Button
								onClick={handleGenerate}
								disabled={loading}
								className="w-full gap-2"
							>
								{loading ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<FileText className="h-4 w-4" />
								)}
								{loading ? "Generating…" : "Generate Receipt"}
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-sm text-green-600 font-medium">
								Receipt generated successfully.
							</p>
							<div className="flex gap-2">
								<a
									href={receiptUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex-1"
								>
									<Button variant="outline" className="w-full gap-2">
										<ExternalLink className="h-4 w-4" />
										View Receipt
									</Button>
								</a>
								<Button
									onClick={handleShare}
									disabled={!customerPhone}
									className="flex-1 gap-2"
								>
									<Share2 className="h-4 w-4" />
									Share via WhatsApp
								</Button>
							</div>
							{!customerPhone && (
								<p className="text-xs text-amber-600">
									Customer phone not found. Copy the receipt link manually to share.
								</p>
							)}
							<Button variant="secondary" onClick={handleDone} className="w-full">
								Done
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
