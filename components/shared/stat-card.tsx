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
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  orange:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "zinc",
  trend,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg shrink-0",
            colorMap[color]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-500 truncate">{title}</p>
          <p className="text-xl font-bold truncate">{value}</p>
          {trend && <p className="text-xs text-zinc-400 mt-0.5">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
