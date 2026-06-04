import { Navigate } from "react-router-dom";
import { useAppSettings, Permission } from "@/hooks/use-app-settings";
import { useAuth } from "@/hooks/use-auth";
import AppLayout from "@/components/AppLayout";
import { ShieldOff } from "lucide-react";

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
}

/**
 * Blocks access to a route when the current user lacks the required permission.
 * Sales Reps are always redirected away from the dashboard (mirrors sidebar rule).
 */
export default function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { hasPermission } = useAppSettings();
  const { user } = useAuth();

  // Sales Reps don't see the dashboard
  if (permission === "pages.dashboard" && user?.role === "Sales Rep") {
    return <Navigate to="/pos" replace />;
  }

  if (hasPermission(permission)) return <>{children}</>;

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Access denied</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          You don't have permission to view this page. Contact an administrator if you believe this is an error.
        </p>
        <p className="mt-3 text-[11px] font-mono text-muted-foreground/70">required: {permission}</p>
      </div>
    </AppLayout>
  );
}