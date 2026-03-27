"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showBackButton?: boolean;
}

export function PageHeader({ 
  title, 
  subtitle, 
  action,
  showBackButton = false 
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="surface-panel mb-1 flex w-full min-w-0 flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl border border-border/70 bg-white/80 text-zinc-500 shadow-sm hover:bg-white"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Overview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight break-words text-zinc-950">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="w-full shrink-0 sm:mt-0 sm:w-auto">{action}</div>}
    </div>
  );
}
