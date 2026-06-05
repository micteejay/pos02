import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-app-settings";
import { toast } from "@/hooks/use-toast";

export type ChangeType =
  | "user_role_change"
  | "user_status_change"
  | "role_create"
  | "role_delete";

export interface PermissionChangeRequest {
  id: string;
  company_id: string;
  change_type: ChangeType;
  payload: any;
  summary: string;
  status: "pending" | "approved" | "rejected";
  requested_by: string;
  requested_by_name: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  review_notes: string | null;
  applied_at: string | null;
  created_at: string;
}

interface Ctx {
  requests: PermissionChangeRequest[];
  pending: PermissionChangeRequest[];
  loading: boolean;
  isApprover: boolean;
  isSuperAdmin: boolean;
  /** Submit a request. Super Admin self-requests are NOT routed here — call apply directly. */
  submit: (input: { change_type: ChangeType; payload: any; summary: string }) => Promise<boolean>;
  approve: (id: string, notes?: string) => Promise<void>;
  reject: (id: string, notes?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const PermissionApprovalsContext = createContext<Ctx | null>(null);

export function PermissionApprovalsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { roles, updateUser, deleteUser, addRole, deleteRole } = useAppSettings();
  const [requests, setRequests] = useState<PermissionChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === "Super Admin";
  const isApprover = isSuperAdmin || user?.role === "Admin";

  const refresh = useCallback(async () => {
    if (!user?.companyId) { setRequests([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("permission_change_requests" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRequests((data as any) || []);
    setLoading(false);
  }, [user?.companyId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user?.companyId) return;
    const ch = supabase
      .channel("pcr-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "permission_change_requests" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.companyId, refresh]);

  const submit = useCallback(async (input: { change_type: ChangeType; payload: any; summary: string }) => {
    if (!user?.companyId || !user?.id) return false;
    const { error } = await supabase.from("permission_change_requests" as any).insert({
      company_id: user.companyId,
      change_type: input.change_type,
      payload: input.payload,
      summary: input.summary,
      requested_by: user.id,
      requested_by_name: user.name,
    } as any);
    if (error) {
      toast({ title: "Could not submit request", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Request submitted", description: "Awaiting Admin / Super Admin approval." });
    return true;
  }, [user?.companyId, user?.id, user?.name]);

  const apply = useCallback(async (req: PermissionChangeRequest) => {
    const p = req.payload || {};
    try {
      switch (req.change_type) {
        case "user_role_change":
          await updateUser(p.user_id, { role: p.new_role });
          break;
        case "user_status_change":
          await updateUser(p.user_id, { status: p.new_status });
          break;
        case "role_create":
          await addRole({ name: p.name, description: p.description || "", color: p.color || "bg-muted text-muted-foreground", permissions: p.permissions || [] });
          break;
        case "role_delete":
          await deleteRole(p.role_id);
          break;
      }
      return true;
    } catch (e: any) {
      toast({ title: "Apply failed", description: e?.message || "Could not apply change", variant: "destructive" });
      return false;
    }
  }, [updateUser, addRole, deleteRole]);

  const approve = useCallback(async (id: string, notes?: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const ok = await apply(req);
    if (!ok) return;
    const { error } = await supabase.from("permission_change_requests" as any).update({
      status: "approved",
      reviewed_by: user?.id,
      reviewed_by_name: user?.name,
      review_notes: notes || null,
      applied_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) {
      toast({ title: "Could not finalize approval", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request approved", description: req.summary });
  }, [requests, apply, user?.id, user?.name]);

  const reject = useCallback(async (id: string, notes?: string) => {
    const { error } = await supabase.from("permission_change_requests" as any).update({
      status: "rejected",
      reviewed_by: user?.id,
      reviewed_by_name: user?.name,
      review_notes: notes || "Rejected",
    } as any).eq("id", id);
    if (error) {
      toast({ title: "Could not reject", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request rejected" });
  }, [user?.id, user?.name]);

  const pending = requests.filter(r => r.status === "pending");

  return (
    <PermissionApprovalsContext.Provider value={{ requests, pending, loading, isApprover, isSuperAdmin, submit, approve, reject, refresh }}>
      {children}
    </PermissionApprovalsContext.Provider>
  );
}

export function usePermissionApprovals() {
  const ctx = useContext(PermissionApprovalsContext);
  if (!ctx) throw new Error("usePermissionApprovals must be used within PermissionApprovalsProvider");
  return ctx;
}