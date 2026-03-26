import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Users,
  Handshake,
  CreditCard,
  Banknote,
  Receipt,
  Bell,
  BarChart3,
  ClipboardList,
  PhoneCall,
  CheckSquare,
  TrendingUp,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

import { ModuleSettings } from "@/app/actions/settings";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: keyof ModuleSettings;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Building2 },
  { label: "Advisors", href: "/advisors", icon: UserCheck },
  { label: "Advisor Analytics", href: "/advisors/analytics", icon: BarChart3 },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Enquiries", href: "/enquiries", icon: PhoneCall },
  { label: "Sales", href: "/sales", icon: Handshake, module: "sales" },
  { label: "Payments", href: "/payments", icon: CreditCard, module: "payments" },
  { label: "Commissions", href: "/commissions", icon: Banknote, module: "commissions" },
  { label: "Expenses", href: "/expenses", icon: Receipt, module: "expenses" },
  { label: "Messaging", href: "/messaging", icon: Bell },
  { label: "Reports", href: "/reports", icon: BarChart3, module: "reports" },
];

export const ADVISOR_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/advisor", icon: LayoutDashboard },
  { label: "Enquiries", href: "/advisor/enquiries", icon: PhoneCall },
  { label: "Customers", href: "/advisor/customers", icon: Users },
  { label: "Sales", href: "/advisor/sales", icon: Handshake, module: "sales" },
  { label: "Payments", href: "/advisor/payments", icon: CreditCard, module: "payments" },
  { label: "My Commissions", href: "/advisor/commissions", icon: Banknote, module: "commissions" },
  { label: "Messaging", href: "/advisor/messaging", icon: Bell },
];