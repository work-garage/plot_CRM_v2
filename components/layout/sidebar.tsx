"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS, type NavItem } from "./nav-items";
import { Button } from "@/components/ui";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  items?: NavItem[];
}

export function Sidebar({ open, onClose, items }: SidebarProps) {
  const pathname = usePathname();
  const navItems = items ?? ADMIN_NAV_ITEMS;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex fixed top-0 left-0 z-50 flex-col w-64 h-full text-white transition-transform duration-200 ease-in-out bg-zinc-950 border-r border-zinc-900 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-900/50">
          <Link href="/dashboard" className="flex gap-3 items-center">
            <div className="flex justify-center items-center w-9 h-9 bg-primary shadow-sm shadow-primary/30 rounded-xl">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight leading-none text-zinc-50">PLOT CRM</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Nav Links */}
        <nav className="overflow-y-auto flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <p className="text-[11px] text-zinc-500">
            © {new Date().getFullYear()} S-INFRA
          </p>
        </div>
      </aside>
    </>
  );
}