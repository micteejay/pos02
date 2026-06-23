import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAppEvents } from "@/hooks/use-app-events";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, MessageSquare, FileText, GitBranch, Bell, Users, Shield, Settings,
  ChevronLeft, ChevronRight, Search, Building2, Package, BarChart3, ClipboardCheck,
  ShoppingCart, PieChart, Truck, Receipt, LogOut, UserCircle, Contact,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badgeKey?: string;
  permission: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  { title: "Overview", items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/", permission: "pages.dashboard" },
    { label: "Notifications", icon: Bell, path: "/notifications", badgeKey: "notifications", permission: "pages.notifications" },
  ]},
  { title: "Operations", items: [
    { label: "POS", icon: ShoppingCart, path: "/pos", permission: "pages.pos" },
    { label: "Inventory", icon: Package, path: "/inventory", permission: "pages.inventory" },
    { label: "Sales", icon: BarChart3, path: "/sales", permission: "pages.sales" },
    { label: "Customers", icon: Contact, path: "/customers", permission: "pages.sales" },
    { label: "Supply Chain", icon: Truck, path: "/supply", permission: "pages.supply" },
    { label: "Workflows", icon: GitBranch, path: "/workflows", permission: "pages.workflows" },
    { label: "Approvals", icon: ClipboardCheck, path: "/approvals", badgeKey: "approvals", permission: "pages.approvals" },
  ]},
  { title: "Communication", items: [
    { label: "Chat", icon: MessageSquare, path: "/chat", badgeKey: "chat", permission: "pages.chat" },
    { label: "Documents", icon: FileText, path: "/documents", permission: "pages.documents" },
    { label: "Invoices", icon: Receipt, path: "/invoices", permission: "pages.documents" },
  ]},
  { title: "Analytics", items: [
    { label: "Reports", icon: PieChart, path: "/reports", permission: "pages.reports" },
  ]},
  { title: "Management", items: [
    { label: "Users & Roles", icon: Users, path: "/users", permission: "pages.users" },
    { label: "Organization", icon: Building2, path: "/organization", permission: "pages.organization" },
    { label: "Audit Log", icon: Shield, path: "/audit", permission: "pages.audit" },
    { label: "Settings", icon: Settings, path: "/settings", permission: "pages.settings" },
    { label: "My Profile", icon: UserCircle, path: "/profile", permission: "dashboard.view" },
  ]},
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { settings, hasPermission } = useAppSettings();
  const { unreadCount, approvalItems } = useAppEvents();
  const { logout, user } = useAuth();

  const pendingApprovals = approvalItems.filter(a => a.status === "pending").length;

  const getBadge = (key?: string): number | undefined => {
    if (!key) return undefined;
    if (key === "notifications" && unreadCount > 0) return unreadCount;
    if (key === "approvals" && pendingApprovals > 0) return pendingApprovals;
    return undefined;
  };

  // Filter sections and items based on permissions
  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.path === "/" && user?.role === "Sales Rep") return false;
        return hasPermission(item.permission as any);
      })
    }))
    .filter(section => section.items.length > 0);

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-sidebar sidebar-glow z-40 flex flex-col transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[260px]"}`}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        {settings.logoUrl || "/logo.png" ? (
          <img src={settings.logoUrl || "/logo.png"} alt="Logo" className="w-8 h-8 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">{settings.appName.charAt(0)}</span>
          </div>
        )}
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-sidebar-accent-foreground font-bold text-sm truncate">{settings.appName}</h1>
            <p className="text-sidebar-foreground text-[10px] truncate">{user?.role || "Command Center"}</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 py-3 animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-foreground text-xs cursor-pointer hover:bg-sidebar-muted transition-colors">
            <Search className="w-3.5 h-3.5" /><span>Search...</span>
            <kbd className="ml-auto text-[10px] bg-sidebar-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {visibleSections.map((section) => (
          <div key={section.title}>
            {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1.5">{section.title}</p>}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const badge = getBadge(item.badgeKey);
                return (
                  <Link key={item.path} to={item.path} onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group relative ${isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground hover:bg-sidebar-muted/50"}`}
                    title={collapsed ? item.label : undefined}>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-sidebar-primary rounded-r" />}
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {badge !== undefined && <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge}</span>}
                      </>
                    )}
                    {collapsed && badge !== undefined && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 shrink-0">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{user.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground truncate">{user.role}</p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hover:text-destructive transition-colors" title="Logout">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {collapsed && (
          <button onClick={logout} className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-foreground hover:text-destructive hover:bg-sidebar-accent/50 transition-colors mb-2" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        )}
        <div className="hidden lg:block">
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-muted/50 transition-colors" title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
