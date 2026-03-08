import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type NotificationType = "approval" | "inventory" | "chat" | "workflow" | "sales" | "supply" | "document" | "system" | "security";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
  actionLabel?: string;
  targetRoles?: string[];
  targetUserId?: string;
  createdBy?: string;
}

export interface ApprovalItem {
  id: string;
  title: string;
  type: "purchase_order" | "stock_transfer" | "expense" | "discount" | "document" | "workflow";
  sourceId: string;
  requester: string;
  department: string;
  amount: number | null;
  description: string;
  submitted: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "approved" | "rejected";
  steps: { role: string; approver: string | null; status: "pending" | "approved" | "rejected"; date: string | null; comment: string | null }[];
  currentStep: number;
}

interface AppEventsContextType {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, "id" | "time" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  unreadCount: number;
  getNotificationsForRole: (role: string, userId?: string) => AppNotification[];
  approvalItems: ApprovalItem[];
  addApprovalItem: (item: Omit<ApprovalItem, "id" | "submitted" | "status" | "currentStep" | "steps">) => void;
  approveItem: (id: string, comment?: string) => void;
  rejectItem: (id: string, comment?: string) => void;
  onApprovalComplete: (id: string, type: string, approved: boolean) => void;
  registerApprovalHandler: (handler: (id: string, type: string, sourceId: string, approved: boolean) => void) => void;
}

const AppEventsContext = createContext<AppEventsContextType>(null!);

export function AppEventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [approvalHandlers, setApprovalHandlers] = useState<((id: string, type: string, sourceId: string, approved: boolean) => void)[]>([]);

  // Fetch notifications and approvals from Supabase
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (data) {
        setNotifications(data.map(n => ({
          id: n.id, type: n.type as NotificationType, title: n.title,
          message: n.message || "", time: new Date(n.created_at).toLocaleString(),
          read: n.read || false, link: n.link || undefined,
          targetRoles: n.target_roles || undefined,
          createdBy: n.created_by_name || undefined,
        })));
      }
    };

    const fetchApprovals = async () => {
      const { data } = await supabase.from("approvals").select("*").order("created_at", { ascending: false });
      if (data) {
        setApprovalItems(data.map(a => ({
          id: a.id, title: a.title, type: a.type as ApprovalItem["type"],
          sourceId: a.source_id || "", requester: a.requester || "",
          department: a.department || "", amount: a.amount ? Number(a.amount) : null,
          description: a.description || "",
          submitted: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          priority: a.priority as ApprovalItem["priority"],
          status: a.status as ApprovalItem["status"],
          steps: [
            { role: "Manager Review", approver: null, status: a.status as any, date: null, comment: a.review_notes || null },
          ],
          currentStep: a.status === "pending" ? 0 : 1,
        })));
      }
    };

    fetchNotifications();
    fetchApprovals();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as any;
        setNotifications(prev => [{
          id: n.id, type: n.type, title: n.title, message: n.message || "",
          time: "Just now", read: false, link: n.link || undefined,
          targetRoles: n.target_roles || undefined,
        }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addNotification = useCallback(async (n: Omit<AppNotification, "id" | "time" | "read">) => {
    if (!user) return;
    // If targeted to roles, use the RPC
    if (n.targetRoles && n.targetRoles.length > 0) {
      await supabase.rpc("send_role_notification", {
        _target_roles: n.targetRoles,
        _type: n.type as any,
        _title: n.title,
        _message: n.message || null,
        _link: n.link || null,
        _created_by: n.createdBy || user.name,
      });
    } else {
      await supabase.rpc("send_notification", {
        _user_id: user.id,
        _type: n.type as any,
        _title: n.title,
        _message: n.message || null,
        _link: n.link || null,
      });
    }
    // Local state will be updated via realtime subscription
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationsForRole = useCallback((role: string, userId?: string) => {
    return notifications; // Already filtered by user_id from DB
  }, [notifications]);

  const addApprovalItem = useCallback(async (item: Omit<ApprovalItem, "id" | "submitted" | "status" | "currentStep" | "steps">) => {
    const { data, error } = await supabase.from("approvals").insert({
      title: item.title, type: item.type, source_id: item.sourceId,
      requester: user?.id || null, department: item.department,
      amount: item.amount, description: item.description,
      priority: item.priority as any, status: "pending" as any,
    }).select().single();

    if (data && !error) {
      setApprovalItems(prev => [{
        ...item, id: data.id,
        submitted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "pending", currentStep: 0,
        steps: [{ role: "Manager Review", approver: null, status: "pending", date: null, comment: null }],
      }, ...prev]);

      addNotification({
        type: "approval",
        title: `New approval request: ${item.title}`,
        message: `${item.requester} submitted a ${item.type.replace(/_/g, " ")} for review`,
        link: "/approvals",
        targetRoles: ["Super Admin", "Admin", "Manager"],
        createdBy: item.requester,
      });
    }
  }, [user, addNotification]);

  const approveItem = useCallback(async (id: string, comment?: string) => {
    await supabase.from("approvals").update({
      status: "approved" as any, reviewed_by: user?.id || null,
      review_notes: comment || null,
    }).eq("id", id);

    setApprovalItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newSteps = [...item.steps];
      newSteps[0] = { ...newSteps[0], status: "approved", approver: user?.name || "Admin", date: new Date().toLocaleDateString(), comment: comment || null };
      approvalHandlers.forEach(h => h(item.id, item.type, item.sourceId, true));
      return { ...item, steps: newSteps, status: "approved" as const, currentStep: 1 };
    }));

    addNotification({ type: "approval", title: "Approval granted", message: comment || "Request has been approved", link: "/approvals" });
  }, [user, approvalHandlers, addNotification]);

  const rejectItem = useCallback(async (id: string, comment?: string) => {
    await supabase.from("approvals").update({
      status: "rejected" as any, reviewed_by: user?.id || null,
      review_notes: comment || "Rejected",
    }).eq("id", id);

    setApprovalItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newSteps = [...item.steps];
      newSteps[0] = { ...newSteps[0], status: "rejected", approver: user?.name || "Admin", date: new Date().toLocaleDateString(), comment: comment || "Rejected" };
      approvalHandlers.forEach(h => h(item.id, item.type, item.sourceId, false));
      return { ...item, steps: newSteps, status: "rejected" as const };
    }));

    addNotification({ type: "approval", title: "Approval rejected", message: comment || "Request has been rejected", link: "/approvals" });
  }, [user, approvalHandlers, addNotification]);

  const onApprovalComplete = useCallback(() => {}, []);
  const registerApprovalHandler = useCallback((handler: (id: string, type: string, sourceId: string, approved: boolean) => void) => {
    setApprovalHandlers(prev => [...prev, handler]);
  }, []);

  return (
    <AppEventsContext.Provider value={{
      notifications, addNotification, markRead, markAllRead, deleteNotification, unreadCount,
      getNotificationsForRole,
      approvalItems, addApprovalItem, approveItem, rejectItem,
      onApprovalComplete, registerApprovalHandler,
    }}>
      {children}
    </AppEventsContext.Provider>
  );
}

export function useAppEvents() {
  return useContext(AppEventsContext);
}
