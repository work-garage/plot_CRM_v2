/**
 * RFC4180-style CSV → 2D string matrix (handles quotes, CRLF, BOM).
 */
export function parseCsvTextToMatrix(text: string): string[][] {
	const s = text.replace(/^\uFEFF/, "");
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let i = 0;
	let inQuotes = false;

	const pushField = () => {
		row.push(field);
		field = "";
	};
	const pushRow = () => {
		pushField();
		if (row.some((x) => x !== "") || rows.length === 0) {
			rows.push(row);
		}
		row = [];
	};

	while (i < s.length) {
		const c = s[i]!;
		if (inQuotes) {
			if (c === '"') {
				if (s[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			field += c;
			i++;
			continue;
		}
		if (c === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (c === ",") {
			pushField();
			i++;
			continue;
		}
		if (c === "\r") {
			i++;
			continue;
		}
		if (c === "\n") {
			pushRow();
			i++;
			continue;
		}
		field += c;
		i++;
	}
	pushRow();
	return rows;
}
