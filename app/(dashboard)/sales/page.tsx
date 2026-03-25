import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { SalesList } from "@/components/sales/sales-list";
import { SalesFilters } from "@/components/sales/sales-filters";
import { getSales } from "@/app/actions/sales";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    phase?: string;
    advisor?: string;
    project?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const sales = await getSales();

  // Extract filter parameters
  const from = params.from ?? "";
  const to = params.to ?? "";
  const phase =
    typeof params.phase === "string" && params.phase !== "all"
      ? params.phase
      : "";
  const advisor =
    typeof params.advisor === "string" && params.advisor !== "all"
      ? params.advisor
      : "";
  const project =
    typeof params.project === "string" && params.project !== "all"
      ? params.project
      : "";
  const sort = typeof params.sort === "string" ? params.sort : "newest";

  // Filter sales based on criteria
  const filteredSales = sales.filter((sale) => {
    // Date range filter (timezone-safe)
    const saleDateStr = String(sale.created_at ?? "").slice(0, 10); // YYYY-MM-DD
    if (from && (!saleDateStr || saleDateStr < from)) return false;
    if (to && (!saleDateStr || saleDateStr > to)) return false;

    // Phase filter (case-insensitive)
    if (phase) {
      const salePhase = String(sale.sale_phase ?? "").toLowerCase().trim();
      const filterPhase = phase.toLowerCase().trim();
      if (salePhase !== filterPhase) return false;
    }

    // Advisor filter
    if (advisor) {
      if (String(sale.advisor_id ?? "") !== advisor) return false;
    }
    // Project filter
    if (project) {
      const projectId = String((sale as any).plots?.projects?.id ?? "");
      if (projectId !== project) return false;
    }

    return true;
  });

  const sortedSales = [...filteredSales].sort((a: any, b: any) => {
    if (sort === "oldest") {
      return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
    }
    if (sort === "project") {
      return String(a.plots?.projects?.name ?? "").localeCompare(
        String(b.plots?.projects?.name ?? "")
      );
    }
    if (sort === "layout") {
      return String(a.sale_phase ?? "").localeCompare(String(b.sale_phase ?? ""));
    }
    // newest default
    return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  });

  const projectOptions = Array.from(
    new Map(
      sales
        .filter((s: any) => s?.plots?.projects?.id)
        .map((s: any) => [s.plots.projects.id, { id: s.plots.projects.id, name: s.plots.projects.name }])
    ).values()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & Bookings"
        subtitle={`${filteredSales.length} transactions recorded`}
        action={
          <Link href="/sales/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          </Link>
        }
      />

      <SalesFilters projects={projectOptions as any[]} />

      {filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <ShoppingCart className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">{sales.length === 0 ? "No sales recorded" : "No sales match these filters"}</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            {sales.length === 0 ? "Record your first plot booking or sale" : "Try adjusting your filter criteria"}
          </p>
          <Link href="/sales/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </Link>
        </div>
      ) : (
        <SalesList sales={sortedSales} />
      )}
    </div>
  );
}
