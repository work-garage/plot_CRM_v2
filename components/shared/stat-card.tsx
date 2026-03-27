import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "green" | "blue" | "orange" | "red" | "zinc";
  trend?: string;
}

const colorMap = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  orange:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-orange-900/30 dark:text-orange-400",
  red: "bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-red-900/30 dark:text-red-400",
  zinc: "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "zinc",
  trend,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 shadow-sm",
            colorMap[color]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</p>
          <p className="mt-1 truncate text-2xl font-semibold text-zinc-950">{value}</p>
          {trend && <p className="mt-1 text-xs text-zinc-400">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
