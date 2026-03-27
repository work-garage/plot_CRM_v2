"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Badge,
} from "@/components/ui";
import { getProjects } from "@/app/actions/project-actions";
import { getPlotsByProject } from "@/app/actions/plots";
import { getAdvisors } from "@/app/actions/advisors";
import { getAdvisorAssignmentsByProject } from "@/app/actions/advisor-projects";
import { SaleForm } from "@/components/sales/sale-form";

type SaleCandidate = {
  id: string;
  name: string;
  phone: string;
  advisor_id?: string | null;
};

export function EnquiryBookingDialog({
  open,
  onOpenChange,
  enquiry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry: SaleCandidate | null;
}) {
  const [projects, setProjects] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [advisorAssignments, setAdvisorAssignments] = useState<any[]>([]);
  const [projectId, setProjectId] = useState("");
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const plotNumberCollator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingProjects(true);
    Promise.all([getProjects(), getAdvisors()])
      .then(([projectRows, advisorRows]) => {
        if (cancelled) return;
        setProjects(projectRows as any[]);
        setAdvisors(advisorRows as any[]);
      })
      .catch((error) => {
        toast.error("Failed to load booking data", {
          description: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!projectId) {
      setPlots([]);
      setSelectedPlotIds([]);
      setAdvisorAssignments([]);
      return;
    }

    let cancelled = false;
    setLoadingPlots(true);
    Promise.all([getPlotsByProject(projectId), getAdvisorAssignmentsByProject(projectId)])
      .then(([plotRows, assignments]) => {
        if (cancelled) return;
        const ordered = [...(plotRows as any[])].sort((a, b) =>
          plotNumberCollator.compare(String(a.plot_number ?? ""), String(b.plot_number ?? "")),
        );
        setPlots(ordered);
        setAdvisorAssignments(assignments as any[]);
        setSelectedPlotIds([]);
      })
      .catch((error) => {
        toast.error("Failed to load project plots", {
          description: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingPlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plotNumberCollator, projectId]);

  useEffect(() => {
    if (!open) {
      setProjectId("");
      setSelectedPlotIds([]);
      setPlots([]);
      setAdvisorAssignments([]);
    }
  }, [open]);

  const selectedPlots = useMemo(
    () =>
      [...plots.filter((plot) => selectedPlotIds.includes(plot.id))].sort((a, b) =>
        plotNumberCollator.compare(String(a.plot_number ?? ""), String(b.plot_number ?? "")),
      ),
    [plotNumberCollator, plots, selectedPlotIds],
  );

  const plotCounts = useMemo(() => {
    return plots.reduce(
      (acc, plot) => {
        const status = String(plot.status ?? "available");
        if (status === "available") acc.available += 1;
        else if (status === "sold") acc.sold += 1;
        else if (status === "token") acc.token += 1;
        else if (status === "agreement") acc.agreement += 1;
        else acc.blocked += 1;
        return acc;
      },
      { available: 0, sold: 0, token: 0, agreement: 0, blocked: 0 },
    );
  }, [plots]);

  function togglePlotSelection(plotId: string) {
    const plot = plots.find((item) => item.id === plotId);
    if (!plot || plot.status !== "available") return;
    setSelectedPlotIds((current) =>
      current.includes(plotId)
        ? current.filter((id) => id !== plotId)
        : [...current, plotId],
    );
  }

  function handleSaleSuccess(completedPlotId: string) {
    setPlots((current) => current.filter((plot) => plot.id !== completedPlotId));
    setSelectedPlotIds((current) => current.filter((id) => id !== completedPlotId));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto border-zinc-200 bg-[linear-gradient(180deg,#fdfdfb_0%,#f7f4ee_100%)] p-0 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
        <DialogHeader>
          <div className="border-b border-black/5 bg-white/80 px-6 py-5 backdrop-blur">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-zinc-950">Close Won by Booking / Sale</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-zinc-600">
            Choose a project and one or more plots for {enquiry?.name ?? "this enquiry"}, then record the bookings.
          </DialogDescription>
          </div>
        </DialogHeader>

        {selectedPlots.length === 0 ? (
          <div className="space-y-5 px-6 pb-6">
            <div className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Project</p>
                <Select value={projectId} onValueChange={setProjectId} disabled={loadingProjects}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {projectId && !loadingPlots && plots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-6 text-sm text-zinc-500">
                No available plots remain in this project.
              </div>
            ) : null}

            {projectId && plots.length > 0 ? (
              <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white/92 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Plot Matrix</p>
                    <p className="mt-1 text-sm text-zinc-700">
                      Plots are shown in natural plot-number order. Available stays green, token stays yellow, agreement stays blue, and sold stays red.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      {plotCounts.available} available
                    </Badge>
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                      {plotCounts.sold} sold
                    </Badge>
                    {plotCounts.token > 0 ? (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        {plotCounts.token} token
                      </Badge>
                    ) : null}
                    {plotCounts.agreement > 0 ? (
                      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                        {plotCounts.agreement} agreement
                      </Badge>
                    ) : null}
                    {plotCounts.blocked > 0 ? (
                      <Badge variant="outline" className="border-zinc-300 bg-zinc-50 text-zinc-700">
                        {plotCounts.blocked} occupied
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="border-zinc-300 bg-zinc-50 text-zinc-700">
                      {selectedPlotIds.length} selected
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] font-medium text-zinc-600">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500" />
                    Sold
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    Token
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-sky-500" />
                    Agreement
                  </span>
                </div>

                <div
                  className="grid gap-2 rounded-2xl border border-zinc-200 bg-[radial-gradient(circle_at_top,#fafaf7_0%,#f4f0e6_100%)] p-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))" }}
                >
                  {plots.map((plot) => {
                    const selected = selectedPlotIds.includes(plot.id);
                    const status = String(plot.status ?? "available");
                    const selectable = status === "available";
                    const statusTone =
                      status === "sold"
                        ? "border-rose-300 bg-rose-100 text-rose-900"
                        : status === "agreement"
                          ? "border-sky-300 bg-sky-100 text-sky-900"
                        : status === "available"
                          ? "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                          : "border-amber-300 bg-amber-100 text-amber-900";
                    const statusLabel =
                      status === "sold"
                        ? "Sold"
                        : status === "agreement"
                          ? "Agreement"
                          : status === "available"
                            ? "Available"
                            : "Token";
                    return (
                      <button
                        key={plot.id}
                        type="button"
                        onClick={() => togglePlotSelection(plot.id)}
                        disabled={!selectable}
                        className={`relative aspect-square rounded-md border text-xs font-semibold transition-all ${
                          selected
                            ? "border-zinc-900 bg-zinc-900 text-white ring-2 ring-zinc-400"
                            : statusTone
                        }`}
                      >
                        <span className="absolute left-0 right-0 top-1 text-[10px] font-medium">
                          {Number(plot.size_sqft ?? 0).toLocaleString("en-IN")} sqft
                        </span>
                        <span className="text-sm font-bold">{plot.plot_number}</span>
                        <span className="absolute bottom-1 left-0 right-0 text-[10px] font-medium">
                          {statusLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 px-6 pb-6">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/92 px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {selectedPlots.length} plot{selectedPlots.length > 1 ? "s" : ""} selected for {enquiry?.name ?? "this enquiry"}
                </p>
                <p className="text-xs text-zinc-500">
                  Complete each selected plot booking below. Finished plots are removed automatically.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setSelectedPlotIds([])}>
                Back to matrix
              </Button>
            </div>

            {selectedPlots.map((selectedPlot) => {
              const project = projects.find((item) => item.id === projectId);
              const plotsForForm = [
                {
                  id: selectedPlot.id,
                  project_id: projectId,
                  plot_number: selectedPlot.plot_number,
                  size_sqft: Number(selectedPlot.size_sqft ?? 0),
                  rate_per_sqft: Number(selectedPlot.rate_per_sqft ?? 0),
                  total_amount: Number(selectedPlot.total_amount ?? 0),
                  projects: {
                    id: projectId,
                    name: project?.name ?? "Project",
                  },
                },
              ];

              return (
                <div key={selectedPlot.id} className="flex justify-center">
                  <SaleForm
                    plots={plotsForForm}
                    customers={enquiry ? [enquiry] : []}
                    advisors={advisors}
                    initialPlotId={selectedPlot.id}
                    initialCustomerId={enquiry?.id}
                    lockPlotSelection
                    lockCustomerSelection
                    hideMockData
                    onCancel={() => setSelectedPlotIds((current) => current.filter((id) => id !== selectedPlot.id))}
                    onSuccess={() => handleSaleSuccess(selectedPlot.id)}
                    advisorAssignments={advisorAssignments}
                  />
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
