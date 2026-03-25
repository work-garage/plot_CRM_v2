"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
	Button,
	Input,
	Textarea,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Checkbox,
} from "@/components/ui";
import {
	reminderSchema,
	type ReminderFormValues,
} from "@/lib/validations/reminder";
import { createReminder, updateReminder } from "@/app/actions/reminders";
import { cn } from "@/lib/utils";

interface ReminderFormProps {
	customers: any[];
	projects?: any[];
	initialData?: any;
	mode?: "create" | "edit";
	onSuccess?: () => void;
	onCancel?: () => void;
	redirectTo?: string;
}

export function ReminderForm({
	customers,
	projects = [],
	initialData,
	mode = "create",
	onSuccess,
	onCancel,
	redirectTo = "/messaging",
}: ReminderFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
	const [statusText, setStatusText] = useState("");

	const form = useForm<ReminderFormValues>({
		resolver: zodResolver(reminderSchema) as any,
		defaultValues: {
			title: initialData?.title || "",
			description: initialData?.description || "",
			phone: initialData?.phone || "",
			reminder_date:
				initialData?.reminder_date || new Date().toISOString().split("T")[0],
			reminder_time: initialData?.reminder_time || "10:00",
			customer_id: initialData?.customer_id || null,
			project_id: initialData?.project_id || null,
			type: initialData?.type || "other",
			is_completed: initialData?.is_completed || false,
		},
	});

	const customerId = form.watch("customer_id");
	const isSelfReminder = form.watch("phone") === "self";

	const fillMockData = () => {
		const titles = [
			"Follow up for Token Payment",
			"Agreement Signing Meeting",
			"Site Visit with Family",
			"Registry Documentation Check",
			"Next Installment Reminder",
			"Birthday Wish - Client",
		];
		const types: any[] = [
			"crm_followup",
			"agreement_expiry",
			"crm_followup",
			"token_expiry",
			"bank_statement",
			"birthday_customer",
		];
		const randomIndex = Math.floor(Math.random() * titles.length);
		const randomTitle = titles[randomIndex];
		const randomType = types[randomIndex];
		const randomCustomer =
			customers.length > 0
				? customers[Math.floor(Math.random() * customers.length)].id
				: null;

		form.reset({
			title: randomTitle,
			description:
				"Meeting scheduled at office regarding Nagpur Wardha Road project.",
			reminder_date: new Date(Date.now() + 86400000)
				.toISOString()
				.split("T")[0], // Tomorrow
			reminder_time: "11:30",
			customer_id: randomCustomer,
			type: randomType,
			is_completed: false,
		});
	};

	const playSubmitTone = (kind: "success" | "error") => {
		if (typeof window === "undefined") return;
		try {
			const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
			if (!AudioCtx) return;
			const ctx = new AudioCtx();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.value = kind === "success" ? 740 : 220;
			gain.gain.value = 0.0001;
			osc.connect(gain);
			gain.connect(ctx.destination);
			const now = ctx.currentTime;
			gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
			gain.gain.exponentialRampToValueAtTime(
				0.0001,
				now + (kind === "success" ? 0.2 : 0.15)
			);
			osc.start(now);
			osc.stop(now + (kind === "success" ? 0.22 : 0.17));
			setTimeout(() => void ctx.close(), 300);
		} catch {}
	};

	async function onSubmit(values: ReminderFormValues) {
		setLoading(true);
		setSubmitStatus("idle");
		setStatusText("");
		try {
			const result =
				mode === "edit"
					? await updateReminder(initialData.id, values)
					: await createReminder(values);

			if (!result.success) {
				toast.error("Error", { description: result.error });
				setSubmitStatus("error");
				setStatusText(result.error ?? "Failed to save reminder");
				playSubmitTone("error");
				return;
			}

			toast.success(
				mode === "edit"
					? "Reminder updated successfully"
					: "Reminder set successfully"
			);
			setSubmitStatus("success");
			setStatusText(mode === "edit" ? "Reminder updated successfully." : "Reminder created successfully.");
			playSubmitTone("success");

			if (onSuccess) {
				onSuccess();
			} else {
				router.push(redirectTo);
				router.refresh();
			}
		} catch (err) {
			toast.error("Something went wrong");
			setSubmitStatus("error");
			setStatusText("Something went wrong while saving reminder.");
			playSubmitTone("error");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Card
			className={cn(
				"max-w-2xl w-full",
				mode === "edit" && "border-none shadow-none"
			)}
		>
			<CardHeader
				className={cn(
					"flex flex-row items-center justify-between space-y-0",
					mode === "edit" && "p-0 pb-4"
				)}
			>
				<div>
					<CardTitle>
						{mode === "edit" ? "Edit Reminder" : "Set Reminder"}
					</CardTitle>
					<CardDescription>
						{mode === "edit"
							? "Modify your follow-up or task"
							: "Schedule a follow-up or task"}
					</CardDescription>
				</div>
				{mode === "create" && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={fillMockData}
					>
						Fill Mock Data
					</Button>
				)}
			</CardHeader>
			<CardContent className={cn(mode === "edit" && "p-0")}>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Task / Title *</FormLabel>
									<FormControl>
										<Input placeholder="e.g. Call for payment" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="reminder_date"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Date *</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="reminder_time"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Time</FormLabel>
										<FormControl>
											<Input type="time" {...field} value={field.value || ""} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Reminder Type *</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select type" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="birthday_customer">
													Birthday (Customer)
												</SelectItem>
												<SelectItem value="birthday_advisor">
													Birthday (Advisor)
												</SelectItem>
												{mode === "edit" && initialData?.type === "installment_due" ? (
													<SelectItem value="installment_due">
														Legacy payment (migrate via Payments)
													</SelectItem>
												) : null}
												<SelectItem value="token_expiry">
													Token Expiry
												</SelectItem>
												<SelectItem value="agreement_expiry">
													Agreement Expiry
												</SelectItem>
												<SelectItem value="crm_followup">
													CRM Follow-up
												</SelectItem>
												<SelectItem value="calling">Calling</SelectItem>
												<SelectItem value="other">Other Task</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="project_id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Related Project</FormLabel>
										<Select
											onValueChange={(value) =>
												field.onChange(value === "none" ? null : value)
											}
											value={field.value || "none"}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a project (optional)" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">None</SelectItem>
												{projects.map((project) => (
													<SelectItem key={project.id} value={project.id}>
														{project.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="customer_id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Related Customer</FormLabel>
										<Select
											onValueChange={(value) =>
												field.onChange(value === "none" ? null : value)
											}
											value={field.value || "none"}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a customer (optional)" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">
													None / Manual / Self
												</SelectItem>
												{customers.map((customer) => (
													<SelectItem key={customer.id} value={customer.id}>
														{customer.name} ({customer.phone})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{(!customerId || customerId === "none") && (
							<div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-4">
								<div className="flex items-center gap-2">
									<Checkbox
										id="self-reminder"
										checked={isSelfReminder}
										onCheckedChange={(checked) => {
											form.setValue("phone", checked ? "self" : "");
										}}
									/>
									<label
										htmlFor="self-reminder"
										className="text-sm font-medium leading-none cursor-pointer"
									>
										This is a self-reminder (no WhatsApp needed)
									</label>
								</div>

								{!isSelfReminder && (
									<FormField
										control={form.control}
										name="phone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Manual Phone Number (WhatsApp)</FormLabel>
												<FormControl>
													<Input
														placeholder="Enter 10-digit phone number"
														{...field}
														value={
															field.value === "self" ? "" : field.value || ""
														}
													/>
												</FormControl>
												<FormDescription>
													If you don't select a customer, enter a phone number
													to send WhatsApp.
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>
						)}

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Details</FormLabel>
									<FormControl>
										<Textarea
											rows={3}
											placeholder="Additional notes about the task"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex gap-3 pt-4 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() => (onCancel ? onCancel() : router.back())}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={
									loading || (mode === "edit" && !form.formState.isDirty)
								}
								className={`min-w-[120px] transition-all duration-300 ${loading ? "scale-[1.02] shadow-md" : ""}`}
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{loading ? "Submitting..." : mode === "edit" ? "Update Reminder" : "Save Reminder"}
							</Button>
						</div>
						{submitStatus !== "idle" && (
							<div className={`mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs animate-in fade-in zoom-in-95 duration-300 ${
								submitStatus === "success"
									? "border-green-200 bg-green-50 text-green-700"
									: "border-red-200 bg-red-50 text-red-700"
							}`}>
								{submitStatus === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
								<span>{statusText}</span>
							</div>
						)}
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
