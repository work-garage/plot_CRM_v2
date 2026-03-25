import { listHrAttendance, listHrEmployees } from "@/app/actions/hr";
import { HrAttendanceClient } from "@/components/hr/hr-attendance-client";

export default async function HrAttendancePage() {
	const [rows, employees] = await Promise.all([listHrAttendance(), listHrEmployees()]);

	return <HrAttendanceClient initialRows={rows} employees={employees} />;
}
