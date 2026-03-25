import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/hr/auth-route";
import { matrixFromAttendanceUpload } from "@/lib/hr/attendance-upload-matrix";
import { parseWorkDurationCsvMatrix } from "@/lib/hr/csv-work-duration-parser";
import {
	upsertParsedAttendanceRows,
	partitionAttendanceRowsForSave,
	summarizeHrSkippedAttendance,
	type HrEmployeeRef,
} from "@/lib/hr/attendance-import";

export async function POST(req: Request) {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const form = await req.formData();
	const file = form.get("file");
	if (!(file instanceof Blob)) {
		return NextResponse.json({ error: "Missing file" }, { status: 400 });
	}

	const name = file instanceof File ? file.name.toLowerCase() : "";

	const yearRaw = form.get("defaultYear");
	const defaultYear =
		typeof yearRaw === "string" && /^\d{4}$/.test(yearRaw.trim())
			? parseInt(yearRaw.trim(), 10)
			: new Date().getFullYear();

	const dryRun =
		form.get("dryRun") === "true" ||
		form.get("dryRun") === "1" ||
		form.get("dryRun") === "yes";

	const buf = await file.arrayBuffer();

	let matrix: unknown[][];
	let fileKind: "excel" | "csv";
	try {
		const out = matrixFromAttendanceUpload(buf, name);
		matrix = out.matrix;
		fileKind = out.kind;
	} catch (e) {
		if (e instanceof Error && e.message === "UNSUPPORTED_TYPE") {
			return NextResponse.json(
				{
					error:
						"Unsupported file type. Use .xlsx / .xls (Excel) or .csv (UTF-8) for the Work Duration report.",
				},
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{
				error:
					"Could not read this file. Re-save the Excel workbook, or export as CSV (UTF-8) and try again.",
			},
			{ status: 400 }
		);
	}

	const { rows, errors: parseErrors, inferredYear, reportMetadata } = parseWorkDurationCsvMatrix(matrix, {
		defaultYear,
	});
	const formatLabel = fileKind === "excel" ? "excel-work-duration" : "csv-work-duration";

	const { data: hrEmps, error: hrErr } = await auth.supabase
		.from("hr_employees")
		.select("id, employee_code, name");
	const hrList = (hrEmps ?? []) as HrEmployeeRef[];

	const partition = hrErr
		? { accepted: [] as typeof rows, skipped: [] as { employee_code: string; work_date: string; reason: string }[] }
		: partitionAttendanceRowsForSave(hrList, rows);

	const { accepted, skipped } = partition;

	const previewRowsPayload = rows.slice(0, 500).map((r) => ({
		employee_code: r.employee_code,
		employee_name: r.employee_name,
		work_date: r.work_date,
		in_time: r.in_time,
		out_time: r.out_time,
		duration_minutes: r.duration_minutes,
		overtime_minutes: r.overtime_minutes,
		attendance_type: r.attendance_type,
		is_valid: r.is_valid,
		error: r.error,
	}));

	const hrSkippedSummary = hrErr ? "" : summarizeHrSkippedAttendance(skipped);
	/** Shown in UI: re-imports never delete other dates */
	const attendanceMergePolicy =
		"Saves merge by employee + date: rows in this file replace the same day if it already exists; new days are added; attendance on dates not in this file is never removed.";

	const basePayload = {
		parsed: rows.length,
		format: formatLabel,
		fileKind,
		defaultYear,
		attendanceMergePolicy,
		/** Effective calendar year used when parsing DD-MMM (and two-digit years) */
		parsedCalendarYear: inferredYear,
		reportPeriodRaw: reportMetadata.reportPeriodRaw,
		reportPeriodStartIso: reportMetadata.reportPeriodStartIso,
		reportPeriodEndIso: reportMetadata.reportPeriodEndIso,
		generatedOnRaw: reportMetadata.generatedOnRaw,
		generatedOnDateIso: reportMetadata.generatedOnDateIso,
		previewRows: previewRowsPayload,
		hrAcceptedRows: accepted.length,
		hrSkippedRows: skipped.length,
		/** One short paragraph for UI (not one line per row). */
		hrSkippedSummary,
		parseErrors,
		/** True when at least one row can be saved to DB (HR match). */
		canConfirmImport: accepted.length > 0 && !hrErr,
		/** Parser + DB only — HR skip details are in `hrSkippedSummary`. */
		errors: [...parseErrors, ...(hrErr ? [hrErr.message] : [])] as string[],
	};

	if (dryRun) {
		return NextResponse.json({
			...basePayload,
			inserted: 0,
			dryRun: true,
			hrValidationOk: !hrErr,
		});
	}

	if (hrErr) {
		return NextResponse.json({
			...basePayload,
			inserted: 0,
			dryRun: false,
			hrValidationOk: false,
		});
	}

	if (accepted.length === 0) {
		return NextResponse.json({
			...basePayload,
			inserted: 0,
			dryRun: false,
			hrValidationOk: true,
			previewRows: previewRowsPayload,
		});
	}

	const { inserted, attendanceCreated, attendanceUpdated, errors: upsertErrors, previewRows } =
		await upsertParsedAttendanceRows(auth.supabase, accepted, { hrEmployees: hrList });

	return NextResponse.json({
		...basePayload,
		inserted,
		attendanceCreated,
		attendanceUpdated,
		errors: [...basePayload.errors, ...upsertErrors],
		previewRows,
		dryRun: false,
		hrValidationOk: true,
	});
}
