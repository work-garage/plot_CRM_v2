import * as XLSX from "xlsx";

const READ_OPTS = { type: "array" as const, cellDates: true, cellNF: false };

function readWorkbook(buffer: ArrayBuffer) {
	return XLSX.read(buffer, READ_OPTS);
}

/** Read first sheet as 2D array (dates as Date where possible). */
export function readSheetMatrixFromBuffer(buffer: ArrayBuffer): unknown[][] {
	const wb = readWorkbook(buffer);
	const sheet = wb.Sheets[wb.SheetNames[0]];
	return XLSX.utils.sheet_to_json(sheet, {
		header: 1,
		defval: "",
		raw: true,
	}) as unknown[][];
}

/** All sheets as matrices (same options as primary parser). */
export function readAllSheetMatricesFromBuffer(buffer: ArrayBuffer): {
	sheetNames: string[];
	matrices: unknown[][][];
} {
	const wb = readWorkbook(buffer);
	const sheetNames = wb.SheetNames;
	const matrices = sheetNames.map((name) => {
		const sh = wb.Sheets[name];
		return XLSX.utils.sheet_to_json(sh, {
			header: 1,
			defval: "",
			raw: true,
		}) as unknown[][];
	});
	return { sheetNames, matrices };
}

/** Make cell values JSON-safe (Date → ISO string, etc.). */
export function serializeCellForJson(value: unknown): unknown {
	if (value === null || value === undefined) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
	if (typeof value === "number") {
		if (!Number.isFinite(value)) return null;
		return value;
	}
	if (typeof value === "boolean") return value;
	if (typeof value === "string") return value;
	return String(value);
}

export type SerializedMatrixResult = {
	rows: unknown[][];
	truncated: boolean;
	totalRows: number;
	includedRows: number;
	maxCols: number;
};

/** 2D matrix safe for JSON.stringify; optional row cap for huge sheets. */
export function serializeMatrixForJson(
	matrix: unknown[][],
	options?: { maxRows?: number }
): SerializedMatrixResult {
	const totalRows = matrix.length;
	const maxRows = options?.maxRows ?? 0;
	const cap = maxRows > 0 ? Math.min(maxRows, totalRows) : totalRows;
	const slice = matrix.slice(0, cap);
	let maxCols = 0;
	const rows = slice.map((row) => {
		const r = row ?? [];
		maxCols = Math.max(maxCols, r.length);
		return r.map((c) => serializeCellForJson(c));
	});
	return {
		rows,
		truncated: cap < totalRows,
		totalRows,
		includedRows: rows.length,
		maxCols,
	};
}
