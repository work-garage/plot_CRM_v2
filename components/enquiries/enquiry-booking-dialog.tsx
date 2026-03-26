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
  const [plotId, setPlotId] = useState("");
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
      setPlotId("");
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
        setPlotId("");
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
      setPlotId("");
      setPlots([]);
      setAdvisorAssignments([]);
    }
  }, [open]);

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === plotId) ?? null,
    [plotId, plots],
  );

  const plotsForForm = useMemo(() => {
    if (!selectedPlot) return [];
    const project = projects.find((item) => item.id === projectId);
    return [
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
  }, [projectId, projects, selectedPlot]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Close Won by Booking / Sale</DialogTitle>
          <DialogDescription>
            Choose a project and plot for {enquiry?.name ?? "this enquiry"}, then record the booking.
          </DialogDescription>
        </DialogHeader>

        {!selectedPlot ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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

              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-700">Available Plot</p>
                <Select value={plotId} onValueChange={setPlotId} disabled={!projectId || loadingPlots}>
                  <SelectTrigger>
                    <SelectValue placeholder={!projectId ? "Select project first" : loadingPlots ? "Loading plots..." : "Select plot"} />
                  </SelectTrigger>
                  <SelectContent>
                    {plots.map((plot) => (
                      <SelectItem key={plot.id} value={plot.id}>
                        {plot.plot_number} ({plot.size_sqft} sqft)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {projectId && !loadingPlots && plots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
                No available plots remain in this project.
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <SaleForm
              plots={plotsForForm}
              customers={enquiry ? [enquiry] : []}
              advisors={advisors}
              initialPlotId={selectedPlot.id}
              initialCustomerId={enquiry?.id}
              lockPlotSelection
              lockCustomerSelection
              hideMockData
              onCancel={() => onOpenChange(false)}
              advisorAssignments={advisorAssignments}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
