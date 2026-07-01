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
    const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    const isOnline = typeof window !== "undefined" && window.navigator.onLine;
    const fullDetail = `${detail} — by ${user?.name || "System"} (${user?.role || "N/A"})`;

    // Always write to local DB for offline viewing
    if (isTauriEnv) {
      try {
        const { getDb } = await import("@/lib/db");
        const db = await getDb();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await db.execute(
          `INSERT OR REPLACE INTO audit_log (id, action, details, user_name, created_at) VALUES (?, ?, ?, ?, ?)`,
          [id, `${action} | ${module} | ${target}`, fullDetail, user?.name || "System", now]
        );
      } catch (e) {
        console.error("[useAudit] Local audit log write failed:", e);
      }
    }

    if (!isTauriEnv || isOnline) {
      await supabase.rpc("log_audit", {
        _action: action,
        _module: module,
        _target: target,
        _detail: fullDetail,
        _severity: severity as any,
      });
    } else {
      // Queue for sync when back online
      try {
        const { enqueueSync } = await import("@/lib/sync-engine");
        await enqueueSync("audit_log", "RPC", { action, module, target, detail: fullDetail, severity });
      } catch (e) {
        console.error("[useAudit] Offline audit queue failed:", e);
      }
    }
  }, [user]);

  const getAuditLog = useCallback(async (): Promise<AuditEntry[]> => {
    const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    const isOnline = typeof window !== "undefined" && window.navigator.onLine;

    if (isTauriEnv && !isOnline) {
      try {
        const { getDb } = await import("@/lib/db");
        const db = await getDb();
        const rows = await db.select("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500");
        return rows.map((e: any) => ({
          id: e.id, timestamp: e.created_at, user: e.user_name || "System",
          userId: "", role: "",
          action: (e.action || "").split(" | ")[0] || e.action,
          module: (e.action || "").split(" | ")[1] || "",
          target: (e.action || "").split(" | ")[2] || "",
          detail: e.details || "", severity: "info" as AuditEntry["severity"],
          ip: "",
        }));
      } catch (e) {
        console.error("[useAudit] Offline audit log read failed:", e);
        return [];
      }
    }

    const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (!data) return [];

    // Cache to local DB
    if (isTauriEnv) {
      try {
        const { getDb } = await import("@/lib/db");
        const db = await getDb();
        for (const e of data) {
          await db.execute(
            `INSERT OR REPLACE INTO audit_log (id, action, details, user_name, created_at) VALUES (?, ?, ?, ?, ?)`,
            [e.id, `${e.action} | ${e.module} | ${e.target || ""}`, e.detail || "", e.user_name || "System", e.created_at]
          );
        }
      } catch (e) {
        console.error("[useAudit] SQLite audit log cache write failed:", e);
      }
    }

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
