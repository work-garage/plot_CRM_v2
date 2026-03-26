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
          "flex fixed top-0 left-0 z-40 flex-col w-64 h-full text-white transition-transform duration-200 ease-in-out bg-zinc-950 border-r border-zinc-900 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-900/50">
          <Link href="/dashboard" className="flex gap-3 items-center">
            <div className="flex justify-center items-center w-11 h-11 bg-primary shadow-sm shadow-primary/30 rounded-xl">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight leading-none text-zinc-50">EstateFlow CRM</p>
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
        <nav className="overflow-y-auto flex-1 px-3 py-4 space-y-1">
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

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-all mt-4 border border-dashed border-primary/30"
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              Add Sections
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950/50">
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
