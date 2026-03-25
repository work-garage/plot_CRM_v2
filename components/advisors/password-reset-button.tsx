"use client";

import { useMemo, useState } from "react";
import { KeyRound, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
} from "@/components/ui";
import { resetAdvisorPassword } from "@/app/actions/advisor-auth";
import { cn } from "@/lib/utils";

export function PasswordResetButton({
	advisorId,
	advisorPhone,
	size = "sm",
	variant = "outline",
	className,
}: {
	advisorId: string;
	advisorPhone: string;
	size?: any;
	variant?: any;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<"phone" | "custom">("phone");
	const [customPassword, setCustomPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [newPassword, setNewPassword] = useState<string | null>(null);

	const phonePassword = useMemo(
		() => advisorPhone.replace(/\D/g, "").slice(-10).padEnd(6, "0"),
		[advisorPhone]
	);

	async function onReset() {
		setLoading(true);
		setNewPassword(null);
		try {
			const res = await resetAdvisorPassword({
				advisorId,
				mode,
				customPassword: mode === "custom" ? customPassword : undefined,
			});
			if (!res.success) {
				toast.error("Failed", { description: res.error });
				return;
			}
			setNewPassword(res.data!.newPassword);
			toast.success("Password updated");
		} finally {
			setLoading(false);
		}
	}

	return (
		<>
			<Button
				size={size}
				variant={variant}
				onClick={() => setOpen(true)}
				className={cn("gap-2", className)}
			>
				<KeyRound className="h-4 w-4" />
				Password
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-lg flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="text-base sm:text-lg">Reset Advisor Password</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
						<div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
							<p className="text-xs text-zinc-600">
								For security, you cannot view the current password. You can only
								reset it.
							</p>
						</div>

						<div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100/50">
							<button
								type="button"
								onClick={() => setMode("phone")}
								className={cn(
									"flex-1 py-2 text-sm font-medium rounded-md transition-colors",
									mode === "phone"
										? "bg-white text-zinc-900 shadow-sm"
										: "text-zinc-600 hover:text-zinc-900"
								)}
							>
								Set to Phone
							</button>
							<button
								type="button"
								onClick={() => setMode("custom")}
								className={cn(
									"flex-1 py-2 text-sm font-medium rounded-md transition-colors",
									mode === "custom"
										? "bg-white text-zinc-900 shadow-sm"
										: "text-zinc-600 hover:text-zinc-900"
								)}
							>
								Custom Password
							</button>
						</div>

						{mode === "phone" ? (
							<div className="space-y-1">
								<p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
									New password will be
								</p>
								<div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3">
									<span className="font-mono text-sm">{phonePassword}</span>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											navigator.clipboard.writeText(phonePassword);
											toast.success("Copied");
										}}
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-2">
								<p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
									Enter new password (min 6 chars)
								</p>
								<Input
									type="text"
									value={customPassword}
									onChange={(e) => setCustomPassword(e.target.value)}
									placeholder="e.g. Adv@1234"
								/>
							</div>
						)}

						<div className="flex gap-2 pt-2">
							<Button
								onClick={onReset}
								disabled={loading || (mode === "custom" && customPassword.trim().length < 6)}
								className="flex-1"
							>
								{loading ? (
									<>
										<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
										Updating...
									</>
								) : (
									"Update Password"
								)}
							</Button>
							<Button variant="outline" onClick={() => setOpen(false)}>
								Close
							</Button>
						</div>

						{newPassword && (
							<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
								<p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
									New Password (shown once)
								</p>
								<div className="mt-2 flex items-center justify-between gap-2">
									<span className="font-mono text-sm text-emerald-900">
										{newPassword}
									</span>
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											navigator.clipboard.writeText(newPassword);
											toast.success("Copied");
										}}
									>
										<Copy className="h-4 w-4 mr-2" />
										Copy
									</Button>
								</div>
								<p className="text-[11px] text-emerald-700 mt-2">
									Share this securely with the advisor.
								</p>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

