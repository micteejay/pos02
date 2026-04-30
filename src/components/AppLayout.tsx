import { ReactNode, useState, useEffect, useRef } from "react";
import AppSidebar from "./AppSidebar";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Menu, Building2 } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings } = useAppSettings();
  const { companyProfile, user } = useAuth();
  const greetedRef = useRef<string | null>(null);

  // Show a one-time toast per session confirming which organization the user
  // landed in — makes RBAC context obvious right after login.
  useEffect(() => {
    if (!user || !companyProfile?.name) return;
    const key = `welcomed:${user.id}:${companyProfile.id || companyProfile.name}`;
    if (greetedRef.current === key) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) {
      greetedRef.current = key;
      return;
    }
    greetedRef.current = key;
    if (typeof window !== "undefined") sessionStorage.setItem(key, "1");
    toast.success(`Working in ${companyProfile.name}`, {
      description: user.role ? `Signed in as ${user.role}` : undefined,
    });
  }, [user, companyProfile]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-xl border-b border-border z-50 flex items-center px-4">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">{settings.appName.charAt(0)}</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{settings.appName}</span>
        </div>
        {companyProfile?.name && (
          <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium max-w-[140px] truncate">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{companyProfile.name}</span>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="w-[260px] h-full" onClick={(e) => e.stopPropagation()}>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Desktop org chip */}
      {companyProfile?.name && (
        <div className="hidden lg:flex fixed top-4 right-6 z-40 items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border shadow-sm">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground max-w-[200px] truncate">{companyProfile.name}</span>
          {user?.role && <span className="text-[10px] text-muted-foreground border-l border-border pl-2 ml-1">{user.role}</span>}
        </div>
      )}

      <main className="lg:ml-[260px] transition-all duration-300 pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
