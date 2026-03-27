export type CanonicalPlotStatus = "available" | "token" | "agreement" | "sold";

export const PLOT_STATUS_LABELS: Record<CanonicalPlotStatus, string> = {
  available: "Available",
  token: "Token",
  agreement: "Agreement",
  sold: "Sold",
};

export function resolvePlotStatus(input: {
  plotStatus?: string | null;
  salePhase?: string | null;
  isCancelled?: boolean | null;
}): CanonicalPlotStatus {
  if (!input.isCancelled) {
    const phase = String(input.salePhase ?? "").toLowerCase();
    if (phase === "token") return "token";
    if (phase === "agreement") return "agreement";
    if (phase === "registry" || phase === "full_payment" || phase === "sold") {
      return "sold";
    }
  }

  const status = String(input.plotStatus ?? "").toLowerCase();
  if (status === "token") return "token";
  if (status === "agreement") return "agreement";
  if (status === "sold") return "sold";
  return "available";
}

export function isPlotOccupied(status: CanonicalPlotStatus): boolean {
  return status !== "available";
}
