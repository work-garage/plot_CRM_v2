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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Building2 },
  { label: "Advisors", href: "/advisors", icon: UserCheck },
  { label: "Advisor Analytics", href: "/advisors/analytics", icon: BarChart3 },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Enquiries", href: "/enquiries", icon: Handshake },
  { label: "Sales", href: "/sales", icon: Handshake },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Commissions", href: "/commissions", icon: Banknote },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Messaging", href: "/messaging", icon: Bell },
  { label: "HR", href: "/hr", icon: ClipboardList },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export const ADVISOR_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/advisor", icon: LayoutDashboard },
  { label: "Customers", href: "/advisor/customers", icon: Users },
  { label: "Sales", href: "/advisor/sales", icon: Handshake },
  { label: "Payments", href: "/advisor/payments", icon: CreditCard },
  { label: "My Commissions", href: "/advisor/commissions", icon: Banknote },
  { label: "Messaging", href: "/advisor/messaging", icon: Bell },
];