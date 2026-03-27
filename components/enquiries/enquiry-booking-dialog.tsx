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
        setPlots((plotRows as any[]).filter((plot) => plot.status === "available"));
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
  }, [projectId]);

  useEffect(() => {
    if (!open) {
      setProjectId("");
      setSelectedPlotIds([]);
      setPlots([]);
      setAdvisorAssignments([]);
    }
  }, [open]);

  const selectedPlots = useMemo(
    () => plots.filter((plot) => selectedPlotIds.includes(plot.id)),
    [plots, selectedPlotIds],
  );

  function togglePlotSelection(plotId: string) {
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Close Won by Booking / Sale</DialogTitle>
          <DialogDescription>
            Choose a project and one or more plots for {enquiry?.name ?? "this enquiry"}, then record the bookings.
          </DialogDescription>
        </DialogHeader>

        {selectedPlots.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-700">Project</p>
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

            {projectId && !loadingPlots && plots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
                No available plots remain in this project.
              </div>
            ) : null}

            {projectId && plots.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Available plots matrix</p>
                    <p className="text-xs text-zinc-500">Click any plot to select it for this enquiry. You can choose multiple plots.</p>
                  </div>
                  <Badge variant="outline">{selectedPlotIds.length} selected</Badge>
                </div>

                <div
                  className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))" }}
                >
                  {plots.map((plot) => {
                    const selected = selectedPlotIds.includes(plot.id);
                    return (
                      <button
                        key={plot.id}
                        type="button"
                        onClick={() => togglePlotSelection(plot.id)}
                        className={`relative aspect-square rounded-md border text-xs font-semibold transition-all ${
                          selected
                            ? "border-zinc-900 bg-zinc-900 text-white ring-2 ring-zinc-400"
                            : "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                        }`}
                      >
                        <span className="absolute left-0 right-0 top-1 text-[10px] font-medium">
                          {Number(plot.size_sqft ?? 0).toLocaleString("en-IN")} sqft
                        </span>
                        <span className="text-sm font-bold">{plot.plot_number}</span>
                        <span className="absolute bottom-1 left-0 right-0 text-[10px] font-medium">
                          Available
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
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
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
