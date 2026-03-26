"use client";

import { useEffect, useTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { buildSearchParams, getPeriodPresetRange } from "@/lib/utils/period-filters";

export function ReportsFilters({
  basePath = "/reports",
  preserveKeys = [],
}: {
  basePath?: string;
  preserveKeys?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  useEffect(() => {
    setCustomFrom(from);
    setCustomTo(to);
  }, [from, to]);

  function pushParams(params: URLSearchParams) {
    const url = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  }

  function applyPreset(preset: "all" | "this_month" | "last_month" | "this_year") {
    const range = getPeriodPresetRange(preset);
    pushParams(buildSearchParams(searchParams, range, preserveKeys));
  }

  return (
    <div className="flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-zinc-600">Period:</span>
        <Button size="sm" variant={!from && !to ? "default" : "outline"} onClick={() => applyPreset("all")}>
          All time
        </Button>
        <Button
          size="sm"
          variant={(() => {
            const range = getPeriodPresetRange("this_month");
            return from === range.from && to === range.to ? "default" : "outline";
          })()}
          onClick={() => applyPreset("this_month")}
        >
          This month
        </Button>
        <Button
          size="sm"
          variant={(() => {
            const range = getPeriodPresetRange("last_month");
            return from === range.from && to === range.to ? "default" : "outline";
          })()}
          onClick={() => applyPreset("last_month")}
        >
          Last month
        </Button>
        <Button
          size="sm"
          variant={(() => {
            const range = getPeriodPresetRange("this_year");
            return from === range.from && to === range.to ? "default" : "outline";
          })()}
          onClick={() => applyPreset("this_year")}
        >
          This year
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-l border-zinc-200 pl-4">
        <span className="text-sm font-medium text-zinc-600">Date range:</span>
        <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-9 w-36" />
        <span className="text-zinc-400">to</span>
        <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-9 w-36" />
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            pushParams(
              buildSearchParams(searchParams, { from: customFrom, to: customTo }, preserveKeys),
            )
          }
          disabled={!customFrom || !customTo || isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying...
            </>
          ) : (
            "Apply"
          )}
        </Button>
      </div>
    </div>
  );
}
