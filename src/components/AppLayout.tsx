import { ReactNode, useState } from "react";
import AppSidebar from "./AppSidebar";
import { Menu, X } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-xl border-b border-border z-50 flex items-center px-4">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">E</span>
          </div>
          <span className="text-sm font-semibold text-foreground">Enterprise Hub</span>
        </div>
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

      <main className="lg:ml-[260px] transition-all duration-300 pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
