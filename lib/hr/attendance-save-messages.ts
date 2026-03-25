const TAIL =
	"Dates that are already saved but not in this file are never removed.";

function breakdownLines(
	saved: number,
	c: number,
	u: number
): { lead: string } | null {
	if (saved <= 0) return null;
	if (c > 0 && u > 0 && c + u === saved) {
		return { lead: `${c} new day(s) added, ${u} existing day(s) updated.` };
	}
	if (u > 0 && c === 0 && c + u === saved) {
		return { lead: `All ${saved} row(s) updated existing days (re-import / overlap).` };
	}
	if (c > 0 && u === 0 && c + u === saved) {
		return { lead: `All ${saved} row(s) are new days.` };
	}
	return { lead: `${saved} row(s) written.` };
}

/** Toast / full sentence including row count. */
export function formatAttendanceSaveDescription(result: {
	inserted: number;
	attendanceCreated?: number;
	attendanceUpdated?: number;
}): string {
	const saved = result.inserted;
	const c = result.attendanceCreated ?? 0;
	const u = result.attendanceUpdated ?? 0;
	const b = breakdownLines(saved, c, u);
	if (!b) return "";
	return `${b.lead} ${TAIL}`;
}

/** Second line under “Saved N of M” — avoids repeating the total. */
export function formatAttendanceSaveBannerSubline(result: {
	inserted: number;
	attendanceCreated?: number;
	attendanceUpdated?: number;
}): string {
	const saved = result.inserted;
	const c = result.attendanceCreated ?? 0;
	const u = result.attendanceUpdated ?? 0;
	const b = breakdownLines(saved, c, u);
	if (!b) return "";
	return `${b.lead} ${TAIL}`;
}
