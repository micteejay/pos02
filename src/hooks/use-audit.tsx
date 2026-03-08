import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  role: string;
  action: string;
  module: string;
  target: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  ip: string;
}

export function useAudit() {
  const { user } = useAuth();

  const logAction = useCallback(async (
    action: string,
    module: string,
    target: string,
    detail: string,
    severity: "info" | "warning" | "critical" = "info"
  ) => {
    await supabase.rpc("log_audit", {
      _action: action,
      _module: module,
      _target: target,
      _detail: `${detail} — by ${user?.name || "System"} (${user?.role || "N/A"})`,
      _severity: severity as any,
    });
  }, [user]);

  const getAuditLog = useCallback(async (): Promise<AuditEntry[]> => {
    const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (!data) return [];
    return data.map(e => ({
      id: e.id, timestamp: e.created_at, user: e.user_name || "System",
      userId: e.user_id || "", role: e.user_role || "",
      action: e.action, module: e.module, target: e.target || "",
      detail: e.detail || "", severity: e.severity as AuditEntry["severity"],
      ip: e.ip_address || "",
    }));
  }, []);

  return { logAction, getAuditLog };
}
