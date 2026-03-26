export const LEAD_STATUS = {
  newLead: "🆕 New Lead — Contact Pending",
  contactPending: "📞 Contact Pending",
  contactDone: "✅ Contact Done — Site Visit Pending",
  siteVisitDone: "🏠 Site Visit Done — Negotiation & Answer Pending",
  closedWon: "🎉 Closed Won",
  closedLost: "❌ Closed Lost",
} as const;

export function isClosedWonStatus(status: string | null | undefined) {
  return String(status ?? "").includes("Closed Won");
}

export function isClosedLostStatus(status: string | null | undefined) {
  return String(status ?? "").includes("Closed Lost");
}

export function isClosedLeadStatus(status: string | null | undefined) {
  return isClosedWonStatus(status) || isClosedLostStatus(status);
}
