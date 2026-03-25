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
    <div className="mb-6 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 -ml-2 shrink-0 text-zinc-500"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="w-full shrink-0 sm:mt-0 sm:w-auto">{action}</div>}
    </div>
  );
}
