"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Button,
	Input,
	Textarea,
	Checkbox,
} from "@/components/ui";
import { getSelfProfile, updateSelfProfile, type SelfProfile } from "@/app/actions/self-profile";

export function SelfProfileModal({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [profile, setProfile] = useState<SelfProfile | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const [advisorForm, setAdvisorForm] = useState({
		name: "",
		phone: "",
		address: "",
		birth_date: "",
		notes: "",
		is_active: true,
	});

	const [adminForm, setAdminForm] = useState({
		name: "",
	});

	async function loadProfile() {
		setLoading(true);
		try {
			const data = await getSelfProfile();
			if (!data) {
				toast.error("Could not load profile");
				return;
			}
			setProfile(data);

			if (data.role === "advisor") {
				setAdvisorForm({
					name: data.advisor.name ?? "",
					phone: data.advisor.phone ?? "",
					address: data.advisor.address ?? "",
					birth_date: data.advisor.birth_date ?? "",
					notes: data.advisor.notes ?? "",
					is_active: data.advisor.is_active ?? true,
				});
			} else {
				setAdminForm({
					name: data.admin.name ?? "",
				});
			}
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (open) void loadProfile();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	async function onSave() {
		if (!profile) return;
		setSaving(true);
		try {
			const res = await updateSelfProfile(
				profile?.role === "advisor" ? advisorForm : adminForm
			);
			if (!res.success) {
				toast.error("Save failed", { description: res.error });
				return;
			}
			toast.success("Saved");
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 flex flex-row flex-wrap items-center justify-between gap-3 text-left">
					<DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
						Self Profile
					</DialogTitle>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
					{loading || !profile ? (
						<div className="space-y-3">
							<div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
							<div className="h-4 w-full bg-zinc-100 rounded animate-pulse" />
							<div className="h-4 w-full bg-zinc-100 rounded animate-pulse" />
							<div className="h-4 w-2/3 bg-zinc-100 rounded animate-pulse" />
						</div>
					) : profile.role === "advisor" ? (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
										Name
									</div>
									<Input
										value={advisorForm.name}
										onChange={(e) => setAdvisorForm((s) => ({ ...s, name: e.target.value }))}
									/>
								</div>
								<div className="space-y-2">
									<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
										Phone
									</div>
									<Input
										value={advisorForm.phone}
										onChange={(e) =>
											setAdvisorForm((s) => ({
												...s,
												phone: e.target.value.replace(/\D/g, "").slice(0, 10),
											}))
										}
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
										Address
									</div>
									<Input
										value={advisorForm.address}
										onChange={(e) => setAdvisorForm((s) => ({ ...s, address: e.target.value }))}
									/>
								</div>
								<div className="space-y-2">
									<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
										Birth date
									</div>
									<Input
										type="date"
										value={advisorForm.birth_date}
										onChange={(e) => setAdvisorForm((s) => ({ ...s, birth_date: e.target.value }))}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
									Notes
								</div>
								<Textarea
									rows={3}
									value={advisorForm.notes}
									onChange={(e) => setAdvisorForm((s) => ({ ...s, notes: e.target.value }))}
								/>
							</div>

							<div className="flex items-center gap-3 pt-2">
								<Checkbox
									checked={advisorForm.is_active}
									onCheckedChange={(v) => {
										setAdvisorForm((s) => ({ ...s, is_active: Boolean(v) }));
									}}
								/>
								<div className="text-sm text-zinc-700">
									Active
								</div>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<div className="space-y-2">
								<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
									Email
								</div>
								<Input value={profile.admin.email ?? ""} disabled />
							</div>
							<div className="space-y-2">
								<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
									Name
								</div>
								<Input
									value={adminForm.name}
									onChange={(e) => setAdminForm({ name: e.target.value })}
								/>
							</div>
							<div className="text-xs text-zinc-500">
								This updates your display name in the header.
							</div>
						</div>
					)}

					<div className="flex justify-end gap-2 pt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="button" onClick={onSave} disabled={saving || loading}>
							{saving ? "Saving..." : "Save changes"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

