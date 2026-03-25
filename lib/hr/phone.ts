/** Normalize to exactly 10 digits (India-style). Empty input → no phone. */
export function tryNormalizeHrPhone(input: string | undefined | null):
	| { ok: true; digits: string | null }
	| { ok: false; error: string } {
	const raw = String(input ?? "").trim();
	if (!raw) return { ok: true, digits: null };
	const digits = raw.replace(/\D/g, "");
	if (digits.length === 0) return { ok: true, digits: null };
	const ten =
		digits.length === 11 && digits.startsWith("0")
			? digits.slice(1)
			: digits.length > 10
				? digits.slice(-10)
				: digits;
	if (ten.length !== 10) {
		return { ok: false, error: "Phone must be exactly 10 digits." };
	}
	return { ok: true, digits: ten };
}
