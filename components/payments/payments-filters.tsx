"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { buildSearchParams, getPeriodPresetRange } from "@/lib/utils/period-filters";

export function PaymentsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const status = searchParams.get("status") ?? "all";
  const mode = searchParams.get("mode") ?? "all";

  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [selectedMode, setSelectedMode] = useState(mode);

  useEffect(() => {
    setCustomFrom(from);
    setCustomTo(to);
    setSelectedStatus(status);
    setSelectedMode(mode);
  }, [from, to, status, mode]);

  function push(params: URLSearchParams) {
    startTransition(() => {
      router.push(params.toString() ? `/payments?${params.toString()}` : "/payments");
    });
  }

  function applyPreset(preset: "all" | "this_month" | "last_month" | "this_year") {
    push(buildSearchParams(searchParams, getPeriodPresetRange(preset), ["status", "mode"]));
  }

  function applyFilters() {
    push(
      buildSearchParams(searchParams, {
        from: customFrom,
        to: customTo,
        status: selectedStatus,
        mode: selectedMode,
      }),
    );
  }

  function clearFilters() {
    setCustomFrom("");
    setCustomTo("");
    setSelectedStatus("all");
    setSelectedMode("all");
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
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedMode} onValueChange={setSelectedMode}>
          <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
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
