export type HrSalaryType = "monthly" | "daily" | "hourly";
export type HrAttendanceType = "present" | "leave" | "holiday";

export type HrEmployeeRow = {
	id: string;
	name: string;
	employee_code: string;
	phone: string | null;
	salary_type: HrSalaryType;
	salary_rate: number;
	overtime_rate: number;
	required_hours_per_week: number;
	grace_hours: number;
	deduction_enabled: boolean;
};

export type ParsedAttendanceRow = {
	employee_code: string;
	/** Set by horizontal parser when present in sheet */
	employee_name?: string;
	work_date: string; // YYYY-MM-DD
	in_time: string | null;
	out_time: string | null;
	duration_minutes: number | null;
	overtime_minutes: number;
	attendance_type: HrAttendanceType;
	is_valid: boolean;
	error?: string;
};
