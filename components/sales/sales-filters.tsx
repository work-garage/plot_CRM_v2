"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import { buildSearchParams, getPeriodPresetRange } from "@/lib/utils/period-filters";

const phaseOptions = [
  { value: "token", label: "Token" },
  { value: "agreement", label: "Agreement" },
  { value: "registry", label: "Registry" },
  { value: "full_payment", label: "Full Payment" },
];

export function SalesFilters({ projects = [] }: { projects?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const phase = searchParams.get("phase") ?? "all";
  const advisor = searchParams.get("advisor") ?? "all";
  const project = searchParams.get("project") ?? "all";
  const sort = searchParams.get("sort") ?? "newest";

  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [selectedPhase, setSelectedPhase] = useState(phase);
  const [selectedAdvisor, setSelectedAdvisor] = useState(advisor);
  const [selectedProject, setSelectedProject] = useState(project);
  const [selectedSort, setSelectedSort] = useState(sort);

  useEffect(() => {
    setCustomFrom(from);
    setCustomTo(to);
    setSelectedPhase(phase);
    setSelectedAdvisor(advisor);
    setSelectedProject(project);
    setSelectedSort(sort);
  }, [from, to, phase, advisor, project, sort]);

  function push(params: URLSearchParams) {
    startTransition(() => {
      router.push(params.toString() ? `/sales?${params.toString()}` : "/sales");
    });
  }

  function applyPreset(preset: "all" | "this_month" | "last_month" | "this_year") {
    push(
      buildSearchParams(
        searchParams,
        { ...getPeriodPresetRange(preset) },
        ["phase", "advisor", "project", "sort"],
      ),
    );
  }

  function applyFilters() {
    push(
      buildSearchParams(searchParams, {
        from: customFrom,
        to: customTo,
        phase: selectedPhase,
        advisor: selectedAdvisor,
        project: selectedProject,
        sort: selectedSort === "newest" ? null : selectedSort,
      }),
    );
  }

  function clearFilters() {
    setCustomFrom("");
    setCustomTo("");
    setSelectedPhase("all");
    setSelectedAdvisor("all");
    setSelectedProject("all");
    setSelectedSort("newest");
    push(new URLSearchParams());
  }

  return (
    <div className="flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-zinc-600">Period:</span>
        <Button size="sm" variant={!from && !to ? "default" : "outline"} onClick={() => applyPreset("all")}>All time</Button>
        <Button size="sm" variant={(() => {
          const range = getPeriodPresetRange("this_month");
          return from === range.from && to === range.to ? "default" : "outline";
        })()} onClick={() => applyPreset("this_month")}>This month</Button>
        <Button size="sm" variant={(() => {
          const range = getPeriodPresetRange("last_month");
          return from === range.from && to === range.to ? "default" : "outline";
        })()} onClick={() => applyPreset("last_month")}>Last month</Button>
        <Button size="sm" variant={(() => {
          const range = getPeriodPresetRange("this_year");
          return from === range.from && to === range.to ? "default" : "outline";
        })()} onClick={() => applyPreset("this_year")}>This year</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-l border-zinc-200 pl-4">
        <span className="text-sm font-medium text-zinc-600">Filters:</span>
        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Sales Phase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {phaseOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((projectOption) => (
              <SelectItem key={projectOption.id} value={projectOption.id}>{projectOption.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSort} onValueChange={setSelectedSort}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Sort: Newest</SelectItem>
            <SelectItem value="oldest">Sort: Oldest</SelectItem>
            <SelectItem value="project">Sort: Project</SelectItem>
            <SelectItem value="layout">Sort: Layout (Phase)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600">Date range:</span>
        <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-9 w-36" />
        <span className="text-zinc-400">to</span>
        <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-9 w-36" />
        <Button size="sm" variant="outline" onClick={applyFilters} disabled={isPending}>
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Applying...</> : "Apply"}
        </Button>
        <Button size="sm" variant="outline" onClick={clearFilters}>Clear</Button>
      </div>
    </div>
  );
}
