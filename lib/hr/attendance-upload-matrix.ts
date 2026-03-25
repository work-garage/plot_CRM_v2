import { parseCsvTextToMatrix } from "@/lib/hr/csv-matrix";
import { readSheetMatrixFromBuffer } from "@/lib/hr/excel-matrix";

export type AttendanceFileKind = "excel" | "csv";

/**
 * Build the same 2D cell matrix whether the user uploads Excel (.xlsx/.xls) or a CSV export.
 * The work-duration parser runs on this matrix in both cases.
 */
export function matrixFromAttendanceUpload(
	buffer: ArrayBuffer,
	filenameLower: string
): { matrix: unknown[][]; kind: AttendanceFileKind } {
	if (filenameLower.endsWith(".csv")) {
		const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
		const stringMatrix = parseCsvTextToMatrix(text);
		return {
			matrix: stringMatrix.map((row) => row.map((cell) => cell as unknown)),
			kind: "csv",
		};
	}
	if (
		filenameLower.endsWith(".xlsx") ||
		filenameLower.endsWith(".xls") ||
		filenameLower.endsWith(".xlsm")
	) {
		return {
			matrix: readSheetMatrixFromBuffer(buffer),
			kind: "excel",
		};
	}
	throw new Error("UNSUPPORTED_TYPE");
}

