// Shared CRM utility functions (not a server action)

export function deriveTaskStatus(f: {
	whatsapp_done: boolean;
	call_done: boolean;
	site_visit_done: boolean;
}): "Completed" | "Pending" {
	return f.whatsapp_done && f.call_done && f.site_visit_done ? "Completed" : "Pending";
}

// ─── Pipeline Status Types ──────────────────────────────────────────────────

export type ContactStatus = {
	label: string;
	color: string; // Tailwind classes for badge background/text/border
	urgencyColor: string; // Tailwind border color for the urgency ring
	sortOrder: number; // 1 = highest urgency (shown first in Active Leads)
	siteVisitDate: string | null;
};

/**
 * Derives the rich display status label for a lead, based on lead_status
 * and the site_visit_date extracted from the latest follow-up entry.
 *
 * Stage 0 (sortOrder 4) — New Lead — Contact Pending
 * Stage 1 (sortOrder 3) — Contact Pending (partial: WhatsApp or Call done)
 * Stage 2 (sortOrder 1) — Contact Done, Site Visit Pending [+ date]
 * Stage 3 (sortOrder 2) — Site Visit Done — Awaiting Decision
 * Closed  (sortOrder 99) — Closed Won / Closed Lost
 */
export function getContactStatus(enq: {
	lead_status: string;
	site_visit_date?: string | null;
	updated_at?: string;
}): ContactStatus {
	const s = enq.lead_status || "🆕 New Lead — Contact Pending";

	// Calculate urgency ring
	let urgencyColor = "border-zinc-200"; // default
	if (enq.updated_at && s !== "🎉 Closed Won" && s !== "❌ Closed Lost") {
		const last = new Date(enq.updated_at).getTime();
		const now = Date.now();
		const diffDays = (now - last) / (1000 * 60 * 60 * 24);
		if (diffDays >= 4) urgencyColor = "border-red-500 ring-2 ring-red-100 ring-offset-1";
		else if (diffDays >= 2) urgencyColor = "border-yellow-500 ring-2 ring-yellow-100 ring-offset-1";
	}

	if (s === "🎉 Closed Won") {
		return {
			label: "🎉 Closed Won",
			color: "bg-green-50 text-green-700 border-green-200",
			urgencyColor: "border-green-200",
			sortOrder: 99,
			siteVisitDate: null,
		};
	}
	if (s === "❌ Closed Lost") {
		return {
			label: "❌ Closed Lost",
			color: "bg-red-50 text-red-700 border-red-200",
			urgencyColor: "border-red-200",
			sortOrder: 99,
			siteVisitDate: null,
		};
	}

	if (s === "✅ Contact Done — Site Visit Pending") {
		const svDate = enq.site_visit_date ?? null;
		const dateStr = svDate
			? new Date(svDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
			: "";
		return {
			label: `✅ Contact Done — Site Visit Pending${dateStr ? ` · ${dateStr}` : ""}`,
			color: "bg-orange-50 text-orange-700 border-orange-200",
			urgencyColor,
			sortOrder: 1,
			siteVisitDate: svDate,
		};
	}

	if (s === "🏠 Site Visit Done — Negotiation & Answer Pending") {
		return {
			label: "🏠 Site Visit Done — Negotiation & Answer Pending",
			color: "bg-purple-50 text-purple-700 border-purple-200",
			urgencyColor,
			sortOrder: 2,
			siteVisitDate: null,
		};
	}

	if (s === "📞 Contact Pending") {
		return {
			label: "📞 Contact Pending",
			color: "bg-sky-50 text-sky-700 border-sky-200",
			urgencyColor,
			sortOrder: 3,
			siteVisitDate: null,
		};
	}

	// Final Fallback: New Lead
	return {
		label: "🆕 New Lead — Contact Pending",
		color: "bg-blue-50 text-blue-700 border-blue-200",
		urgencyColor,
		sortOrder: 4,
		siteVisitDate: null,
	};
}

/**
 * Sorts active leads by urgency:
 * 1. Contact Done + Site Visit Pending → by nearest site visit date (ascending)
 * 2. Site Visit Done — Awaiting Decision
 * 3. Contact Pending
 * 4. New Lead — Contact Pending (shown last)
 */
export function sortActiveLeads<
	T extends { lead_status: string; site_visit_date?: string | null; created_at: string; updated_at?: string },
>(leads: T[]): T[] {
	return [...leads].sort((a, b) => {
		const ca = getContactStatus(a);
		const cb = getContactStatus(b);

		// Primary: sortOrder ascending (1 = most urgent)
		if (ca.sortOrder !== cb.sortOrder) return ca.sortOrder - cb.sortOrder;

		// Tiebreaker for Stage 2: nearest site visit date first
		if (ca.sortOrder === 1) {
			const da = ca.siteVisitDate ? new Date(ca.siteVisitDate).getTime() : Infinity;
			const db = cb.siteVisitDate ? new Date(cb.siteVisitDate).getTime() : Infinity;
			if (da !== db) return da - db;
		}

		// Default: newer enquiry first
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	});
}
