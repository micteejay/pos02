import { useCallback } from "react";
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

const STORAGE_KEY = "audit-log-entries";

function getEntries(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveEntries(entries: AuditEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 500))); // keep last 500
}

export function useAudit() {
  const { user } = useAuth();

  const logAction = useCallback((
    action: string,
    module: string,
    target: string,
    detail: string,
    severity: "info" | "warning" | "critical" = "info"
  ) => {
    const entry: AuditEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: user?.name || "System",
      userId: user?.id || "",
      role: user?.role || "",
      action,
      module,
      target,
      detail: `${detail} — by ${user?.name || "System"} (${user?.role || "N/A"})`,
      severity,
      ip: "127.0.0.1",
    };
    const entries = [entry, ...getEntries()];
    saveEntries(entries);
    return entry;
  }, [user]);

  const getAuditLog = useCallback((): AuditEntry[] => {
    return getEntries();
  }, []);

  return { logAction, getAuditLog };
}
