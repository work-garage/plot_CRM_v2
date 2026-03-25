"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Loader2 } from "lucide-react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";
import { createHrEmployee, updateHrEmployee, type HrEmployeeRow } from "@/app/actions/hr";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CreateProps = {
	variant?: "create";
	employee?: undefined;
	open?: undefined;
	onOpenChange?: undefined;
};

type EditProps = {
	variant: "edit";
	employee: HrEmployeeRow;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type HrEmployeeDialogProps = (CreateProps | EditProps) & {
	onSuccess?: () => void;
};

function defaultForm() {
	return {
		name: "",
		employee_code: "",
		phone: "",
		salary_type: "monthly",
		salary_rate: "",
		overtime_rate: "",
		required_hours_per_week: "48",
		grace_hours: "0",
	};
}

function formFromEmployee(e: HrEmployeeRow) {
	return {
		name: e.name ?? "",
		employee_code: e.employee_code ?? "",
		phone: e.phone ?? "",
		salary_type: e.salary_type ?? "monthly",
		salary_rate: String(e.salary_rate ?? ""),
		overtime_rate: String(e.overtime_rate ?? ""),
		required_hours_per_week: String(e.required_hours_per_week ?? 48),
		grace_hours: String(e.grace_hours ?? 0),
	};
}

export function HrEmployeeDialog(props: HrEmployeeDialogProps) {
	const { onSuccess } = props;
	const router = useRouter();
	const isEdit = props.variant === "edit";
	const [internalOpen, setInternalOpen] = useState(false);
	const open = isEdit ? props.open : internalOpen;
	const setOpen = isEdit ? props.onOpenChange : setInternalOpen;

	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState(defaultForm);

	useEffect(() => {
		if (!open) return;
		if (isEdit && props.variant === "edit") {
			setForm(formFromEmployee(props.employee));
			return;
		}
		setForm(defaultForm());
	}, [open, isEdit, isEdit && props.variant === "edit" ? props.employee.id : "create"]);

	const submit = async () => {
		setLoading(true);
		try {
			const payload = {
				name: form.name,
				employee_code: form.employee_code,
				phone: form.phone || undefined,
				salary_type: form.salary_type,
				salary_rate: Number(form.salary_rate),
				overtime_rate: Number(form.overtime_rate || 0),
				required_hours_per_week: Number(form.required_hours_per_week || 48),
				grace_hours: Number(form.grace_hours || 0),
			};
			const res = isEdit
				? await updateHrEmployee(props.employee.id, payload)
				: await createHrEmployee(payload);
			if (!res.success) {
				toast.error(res.error ?? "Failed");
				return;
			}
			toast.success(isEdit ? "Employee updated" : "Employee created");
			setOpen(false);
			onSuccess?.();
			await router.refresh();
		} finally {
			setLoading(false);
		}
	};

	const title = isEdit ? "Edit employee" : "New employee";

	return (
		<>
			{!isEdit && (
				<Button size="sm" onClick={() => setOpen(true)} className="gap-2">
					<Plus className="h-4 w-4" />
					Add employee
				</Button>
			)}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							{isEdit && <Pencil className="h-4 w-4 opacity-70" />}
							{title}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="grid gap-1">
							<span className="text-sm font-medium">Name</span>
							<Input
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							/>
						</div>
						<div className="grid gap-1">
							<span className="text-sm font-medium">Employee code</span>
							<Input
								value={form.employee_code}
								onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))}
								className="font-mono"
							/>
						</div>
						<div className="grid gap-1">
							<span className="text-sm font-medium">Phone (10 digits)</span>
							<Input
								inputMode="numeric"
								autoComplete="tel"
								maxLength={10}
								placeholder="9876543210"
								value={form.phone}
								onChange={(e) => {
									const v = e.target.value.replace(/\D/g, "").slice(0, 10);
									setForm((f) => ({ ...f, phone: v }));
								}}
							/>
						</div>
						<div className="grid gap-1">
							<span className="text-sm font-medium">Salary type</span>
							<Select
								value={form.salary_type}
								onValueChange={(v) => setForm((f) => ({ ...f, salary_type: v }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="monthly">Monthly</SelectItem>
									<SelectItem value="daily">Daily</SelectItem>
									<SelectItem value="hourly">Hourly</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="grid gap-1">
								<span className="text-sm font-medium">Salary rate</span>
								<Input
									type="number"
									value={form.salary_rate}
									onChange={(e) => setForm((f) => ({ ...f, salary_rate: e.target.value }))}
								/>
							</div>
							<div className="grid gap-1">
								<span className="text-sm font-medium">Overtime rate / hr</span>
								<Input
									type="number"
									value={form.overtime_rate}
									onChange={(e) => setForm((f) => ({ ...f, overtime_rate: e.target.value }))}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="grid gap-1">
								<span className="text-sm font-medium">Required hrs / week</span>
								<Input
									type="number"
									value={form.required_hours_per_week}
									onChange={(e) =>
										setForm((f) => ({ ...f, required_hours_per_week: e.target.value }))
									}
								/>
							</div>
							<div className="grid gap-1">
								<span className="text-sm font-medium">Grace hours</span>
								<Input
									type="number"
									value={form.grace_hours}
									onChange={(e) => setForm((f) => ({ ...f, grace_hours: e.target.value }))}
								/>
							</div>
						</div>
						<Button disabled={loading || !form.name || !form.employee_code} onClick={submit}>
							{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Update" : "Save"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
