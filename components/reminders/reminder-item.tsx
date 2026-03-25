"use client";

import { useState } from "react";
import {
	Bell,
	Calendar,
	User,
	CheckCircle2,
	Clock,
	MessageSquare,
	Phone,
	MoreVertical,
	Pencil,
	Trash2,
} from "lucide-react";
import {
	Card,
	CardContent,
	Checkbox,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Dialog,
	DialogContent,
} from "@/components/ui";
import { formatDate } from "@/lib/utils/formatters";
import { toggleReminder, deleteReminder } from "@/app/actions/reminders";
import { getTemplateForType, fillTemplate, type ReminderType } from "@/lib/reminder-templates";
import { toast } from "sonner";
import { ReminderForm } from "./reminder-form";

interface ReminderItemProps {
	reminder: any;
	customers?: any[];
}

export function ReminderItem({ reminder, customers = [] }: ReminderItemProps) {
	const [isCompleted, setIsCompleted] = useState(reminder.is_completed);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	const handleWhatsApp = async (e: React.MouseEvent) => {
		e.stopPropagation();
		const rawPhone =
			reminder.customers?.phone ||
			(reminder.phone !== "self" ? reminder.phone : null);

		if (!rawPhone) {
			toast.error("No phone number found for this reminder");
			return;
		}

		const phone = rawPhone.replace(/\D/g, "");
		const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;

		const customerName = reminder.customers?.name || "there";
		const type = (reminder.type || "other") as ReminderType;
		const template = getTemplateForType(type);
		const message = template
			? fillTemplate(template.body, {
					name: customerName,
					date: formatDate(reminder.reminder_date),
					title: reminder.title,
					description: reminder.description || "",
				})
			: `Hello ${customerName}, regarding your task: ${reminder.title}.\n\nRegards,\nS-Infra\nContact: +91 9876543210`;

		const encodedMessage = encodeURIComponent(message);
		window.open(
			`https://wa.me/${formattedPhone}?text=${encodedMessage}`,
			"_blank"
		);

		// Automatically mark as completed after sending WhatsApp
		if (!isCompleted) {
			await handleToggle(true);
		}
	};

	const handleToggle = async (checked: boolean) => {
		setIsCompleted(checked);
		try {
			const result = await toggleReminder(reminder.id, checked);
			if (!result.success) {
				setIsCompleted(!checked);
				toast.error("Failed to update reminder");
			} else {
				toast.success(
					checked ? "Task marked as completed" : "Task marked as pending"
				);
			}
		} catch (err) {
			setIsCompleted(!checked);
			toast.error("Something went wrong");
		}
	};

	const handleDelete = async () => {
		try {
			const result = await deleteReminder(reminder.id);
			if (result.success) {
				toast.success("Reminder deleted successfully");
			} else {
				toast.error("Failed to delete reminder");
			}
		} catch (err) {
			toast.error("Something went wrong");
		}
	};

	return (
		<>
			<Card
				className={`border-zinc-200 hover:border-zinc-300 transition-all duration-200 shadow-sm hover:shadow-md ${
					isCompleted ? "bg-zinc-50/50" : "bg-white"
				}`}
			>
				<CardContent className="p-4 md:p-5 flex items-start gap-4">
					<div className="flex-1 min-w-0">
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								{isCompleted ? (
									<CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
								) : (
									<Clock className="h-5 w-5 text-zinc-400 shrink-0" />
								)}
								<h4
									className={`font-semibold text-base ${
										isCompleted ? "text-zinc-400 line-through" : "text-zinc-900"
									}`}
								>
									{reminder.title}
								</h4>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100 whitespace-nowrap w-fit">
									<Calendar className="h-3.5 w-3.5" />
									{formatDate(reminder.reminder_date)}
									{reminder.reminder_time && ` @ ${reminder.reminder_time}`}
								</div>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
											<Pencil className="h-4 w-4 mr-2" />
											Edit Task
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-red-600"
											onClick={() => setIsDeleteDialogOpen(true)}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Delete Task
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{reminder.description && (
							<p
								className={`text-sm mt-2 leading-relaxed max-w-2xl ${
									isCompleted ? "text-zinc-400" : "text-zinc-600"
								}`}
							>
								{reminder.description}
							</p>
						)}

						<div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-3 pt-4 border-t border-zinc-50">
							<div className="flex flex-wrap gap-2">
								{reminder.customers ? (
									<div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50/50 w-fit px-3 py-1.5 rounded-lg border border-blue-100/50">
										<User className="h-4 w-4" />
										{reminder.customers.name}
									</div>
								) : reminder.phone === "self" ? (
									<div className="flex items-center gap-2 text-sm font-medium text-zinc-600 bg-zinc-50 w-fit px-3 py-1.5 rounded-lg border border-zinc-200">
										<User className="h-4 w-4" />
										Self Reminder
									</div>
								) : reminder.phone ? (
									<div className="flex items-center gap-2 text-sm font-medium text-orange-600 bg-orange-50 w-fit px-3 py-1.5 rounded-lg border border-orange-100">
										<Phone className="h-4 w-4" />
										{reminder.phone}
									</div>
								) : null}
							</div>

							<div className="flex items-center gap-2">
								{!isCompleted && (
									<Button
										size="sm"
										variant="ghost"
										className="h-9 text-xs font-semibold text-zinc-500 hover:text-blue-600 hover:bg-blue-50"
										onClick={() => handleToggle(true)}
									>
										<CheckCircle2 className="h-4 w-4 mr-2" />
										Mark as Completed
									</Button>
								)}
								{(reminder.customers?.phone ||
									(reminder.phone && reminder.phone !== "self")) && (
									<Button
										size="sm"
										variant="outline"
										className="h-9 text-xs font-semibold gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300 px-4 shadow-sm"
										onClick={handleWhatsApp}
									>
										<MessageSquare className="h-4 w-4" />
										WhatsApp
									</Button>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Delete Confirmation Modal */}
			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the
							reminder for "{reminder.title}".
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete Task
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl flex-col gap-0 overflow-hidden border border-border p-0 shadow-xl">
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
						<div className="flex justify-end mb-4">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setIsEditDialogOpen(false)}
							>
								Close
							</Button>
						</div>
						<ReminderForm
							customers={customers}
							initialData={reminder}
							mode="edit"
							onSuccess={() => {
								setIsEditDialogOpen(false);
							}}
							onCancel={() => setIsEditDialogOpen(false)}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
