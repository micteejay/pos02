import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Loads the authenticated user's effective permissions from the database
 * (aggregated across all their roles) and exposes a `can()` helper.
 *
 * Permission strings follow the `module.action` convention, e.g.
 * `sales.credit`, `inventory.write`, `customers.payment`, `po.approve`.
 * Admin / Super Admin always pass through.
 */
export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.rpc("get_user_permissions", { _user_id: user.id });
    setPermissions(Array.isArray(data) ? (data as string[]) : []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = user?.role === "Super Admin" || user?.role === "Admin";

  const can = useCallback(
    (perm: string | string[]) => {
      if (isAdmin) return true;
      const list = Array.isArray(perm) ? perm : [perm];
      return list.some((p) => permissions.includes(p));
    },
    [permissions, isAdmin]
  );

  const canAny = can;
  const canAll = useCallback(
    (perms: string[]) => {
      if (isAdmin) return true;
      return perms.every((p) => permissions.includes(p));
    },
    [permissions, isAdmin]
  );

  return { permissions, loading, can, canAny, canAll, isAdmin, refresh };
}

interface CanProps {
  permission: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/** Convenience render-gate. Renders children only when the current user has the permission. */
export function Can({ permission, fallback = null, children }: CanProps) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}