"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Skeleton,
} from "@/components/ui";
import { SaleForm } from "@/components/sales/sale-form";
import { getCustomers } from "@/app/actions/customers";
import { getAdvisors } from "@/app/actions/advisors";
import { getAdvisorAssignmentsByProject } from "@/app/actions/advisor-projects";

export function SaleBookingDialog({
  open,
  onOpenChange,
  projectName,
  plot,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectId: string;
  plot: {
    id: string;
    plot_number: string;
    size_sqft: number;
    rate_per_sqft: number;
    status: string;
    facing: string | null;
  };
}) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [advisors, setAdvisorsState] = useState<any[]>([]);
  const [advisorAssignments, setAdvisorAssignments] = useState<any[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    // Cache to keep modal opening instant on repeated clicks.
    if (hasLoaded) return;

    setLoading(true);
    Promise.all([
      getCustomers(),
      getAdvisors(),
      getAdvisorAssignmentsByProject(projectId),
    ])
      .then(([c, a, assignments]) => {
        if (cancelled) return;
        setCustomers(c as any[]);
        setAdvisorsState(a as any[]);
        setAdvisorAssignments(assignments as any[]);
        setHasLoaded(true);
      })
      .catch((e: any) => {
        toast.error("Failed to load required data", {
          description: e?.message || String(e),
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, hasLoaded]);

  const plotsForForm = useMemo(() => {
    return [
      {
        id: plot.id,
        project_id: projectId,
        plot_number: plot.plot_number,
        size_sqft: Number(plot.size_sqft ?? 0),
        rate_per_sqft: Number(plot.rate_per_sqft ?? 0),
        total_amount: Number(plot.size_sqft ?? 0) * Number(plot.rate_per_sqft ?? 0),
        projects: {
          id: projectId,
          name: projectName,
        },
      },
    ];
  }, [plot, projectId, projectName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate">Sell / Book</div>
              <div className="text-xs text-zinc-500 font-normal truncate">
                {projectName} • Plot {plot.plot_number}
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 p-4">
              <Skeleton className="h-6 w-48 mb-3" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-2/3 mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <SaleForm
              plots={plotsForForm as any[]}
              customers={customers}
              advisors={advisors}
              initialPlotId={plot.id}
              advisorAssignments={advisorAssignments}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

