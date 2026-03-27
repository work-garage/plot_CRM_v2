import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS, type NavItem } from "./nav-items";
import { Button } from "@/components/ui";

import { useModules } from "@/components/providers/module-context";
import { AddSectionsModal } from "./add-sections-modal";
import { PlusCircle } from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  items?: NavItem[];
}

export function Sidebar({ open, onClose, items }: SidebarProps) {
  const pathname = usePathname();
  const { modules } = useModules();
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter items based on modules
  const rawItems = items ?? ADMIN_NAV_ITEMS;
  const navItems = rawItems.filter(item => !item.module || modules[item.module]);

  const isAdmin = !items; // Simple heuristic: Admin layout doesn't pass items

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
          "fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(10,15,29,0.98),rgba(18,26,45,0.98))] text-white shadow-[20px_0_50px_-32px_rgba(15,23,42,0.95)] transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <Link href="/dashboard" className="flex gap-3 items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner shadow-white/10">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight leading-none text-zinc-50">EstateFlow CRM</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-zinc-500">Operations Suite</p>
            </div>
          </Link>
          <button
            className="lg:hidden text-zinc-400 hover:text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && item.href !== "/advisor" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white text-zinc-950 shadow-[0_12px_24px_-18px_rgba(255,255,255,0.8)]"
                    : "text-zinc-400 hover:bg-white/6 hover:text-zinc-50"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/20 px-3.5 py-3 text-sm font-medium text-zinc-200 transition-all hover:border-primary/40 hover:bg-white/6 hover:text-white"
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              Add Sections
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 bg-white/[0.03] px-6 py-4">
          <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest mb-1">Source</p>
          <p className="text-[11px] text-zinc-400 font-medium">
            © {new Date().getFullYear()} EstateFlow CRM
          </p>
        </div>

        <AddSectionsModal open={showAddModal} onOpenChange={setShowAddModal} />
      </aside>
    </>
  );
}
