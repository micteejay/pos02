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

export interface WorkflowStage {
  id: string;
  name: string;
  role: string;
  description: string;
}

export interface ApprovalStep {
  role: string;
  name: string;
  approver: string | null;
  status: "pending" | "approved" | "rejected";
  date: string | null;
  comment: string | null;
}

export interface ApprovalItem {
  id: string;
  title: string;
  type: "purchase_order" | "stock_transfer" | "expense" | "discount" | "document" | "workflow" | "general";
  sourceId: string;
  requester: string;
  department: string;
  amount: number | null;
  description: string;
  submitted: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "approved" | "rejected";
  steps: ApprovalStep[];
  currentStep: number;
}

interface WorkflowConfig {
  purchase_order: WorkflowStage[];
  stock_transfer: WorkflowStage[];
  expense: WorkflowStage[];
  discount: WorkflowStage[];
  document: WorkflowStage[];
  workflow: WorkflowStage[];
  general: WorkflowStage[];
}

const defaultWorkflowConfig: WorkflowConfig = {
  purchase_order: [
    { id: "1", name: "Manager Review", role: "manager", description: "Manager reviews the purchase order" },
    { id: "2", name: "Admin Approval", role: "admin", description: "Admin gives final approval" },
  ],
  stock_transfer: [
    { id: "1", name: "Warehouse Check", role: "warehouse_staff", description: "Warehouse staff verifies stock" },
    { id: "2", name: "Manager Approval", role: "manager", description: "Manager approves transfer" },
  ],
  expense: [
    { id: "1", name: "Manager Review", role: "manager", description: "Manager reviews expense" },
    { id: "2", name: "Admin Approval", role: "admin", description: "Admin approves expense" },
  ],
  discount: [
    { id: "1", name: "Manager Approval", role: "manager", description: "Manager approves discount request" },
  ],
  document: [
    { id: "1", name: "Manager Review", role: "manager", description: "Manager reviews document" },
    { id: "2", name: "Admin Approval", role: "admin", description: "Admin gives final approval" },
  ],
  workflow: [
    { id: "1", name: "Manager Review", role: "manager", description: "Manager reviews workflow request" },
    { id: "2", name: "Admin Approval", role: "admin", description: "Admin approves workflow" },
  ],
  general: [
    { id: "1", name: "Manager Approval", role: "manager", description: "Manager reviews and approves" },
  ],
};

// Map user role name to role key
const roleNameToKey: Record<string, string> = {
  "Super Admin": "super_admin",
  "Admin": "admin",
  "Manager": "manager",
  "Sales Rep": "sales_rep",
  "Warehouse Staff": "warehouse_staff",
  "Viewer": "viewer",
};

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
  canApproveItem: (item: ApprovalItem) => boolean;
  onApprovalComplete: (id: string, type: string, approved: boolean) => void;
  registerApprovalHandler: (handler: (id: string, type: string, sourceId: string, approved: boolean) => void) => void;
  workflowConfig: WorkflowConfig;
  getStagesForType: (type: string) => WorkflowStage[];
}

const AppEventsContext = createContext<AppEventsContextType>(null!);

export function AppEventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [approvalHandlers, setApprovalHandlers] = useState<((id: string, type: string, sourceId: string, approved: boolean) => void)[]>([]);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>(defaultWorkflowConfig);

  // Fetch workflow config from app_settings
  useEffect(() => {
    const fetchWorkflowConfig = async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("key", "workflow_stages").single();
      if (data?.value) {
        try {
          const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          setWorkflowConfig(prev => ({ ...prev, ...val }));
        } catch {}
      }
    };
    fetchWorkflowConfig();
  }, []);

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
      const profilesRes = await supabase.from("profiles").select("id, name");
      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.name || "Unknown"]));

      if (data) {
        setApprovalItems(data.map(a => {
          // Parse workflow_steps from DB (stored as JSONB array)
          let steps: ApprovalStep[] = [];
          if (a.workflow_steps && Array.isArray(a.workflow_steps)) {
            steps = (a.workflow_steps as any[]).map(s => ({
              role: s.role || "manager",
              name: s.name || "Review",
              approver: s.approver || null,
              status: s.status || "pending",
              date: s.date || null,
              comment: s.comment || null,
            }));
          } else {
            // Fallback for old approvals without workflow_steps
            steps = [{ role: "manager", name: "Manager Review", approver: null, status: a.status as any, date: null, comment: a.review_notes || null }];
          }

          return {
            id: a.id, title: a.title, type: a.type as ApprovalItem["type"],
            sourceId: a.source_id || "", 
            requester: a.requester ? (profileMap.get(a.requester) || a.requester) : "Unknown",
            department: a.department || "", amount: a.amount ? Number(a.amount) : null,
            description: a.description || "",
            submitted: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            priority: a.priority as ApprovalItem["priority"],
            status: a.status as ApprovalItem["status"],
            steps,
            currentStep: a.current_workflow_step ?? 0,
          };
        }));
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

  // Get stages for a given type
  const getStagesForType = useCallback((type: string): WorkflowStage[] => {
    const typeKey = type.toLowerCase().replace(/ /g, "_") as keyof WorkflowConfig;
    if (workflowConfig[typeKey]) {
      return workflowConfig[typeKey];
    }
    // Fallback to general if type not found
    return workflowConfig.general;
  }, [workflowConfig]);

  // Check if current user can approve a specific approval item
  const canApproveItem = useCallback((item: ApprovalItem): boolean => {
    if (!user || item.status !== "pending") return false;
    
    const userRoleKey = roleNameToKey[user.role] || user.role.toLowerCase().replace(/ /g, "_");
    
    // Super Admin and Admin can always approve any step
    if (userRoleKey === "super_admin" || userRoleKey === "admin") return true;
    
    // Check if user's role matches the current step's required role
    const currentStepData = item.steps[item.currentStep];
    if (!currentStepData) return false;
    
    return currentStepData.role === userRoleKey;
  }, [user]);

  const addApprovalItem = useCallback(async (item: Omit<ApprovalItem, "id" | "submitted" | "status" | "currentStep" | "steps">) => {
    // Get configured stages for this type
    const stages = getStagesForType(item.type);
    
    // Build workflow_steps array from configured stages
    const workflowSteps = stages.map(stage => ({
      role: stage.role,
      name: stage.name,
      approver: null,
      status: "pending",
      date: null,
      comment: null,
    }));

    const { data, error } = await supabase.from("approvals").insert({
      title: item.title, type: item.type, source_id: item.sourceId,
      requester: user?.id || null, department: item.department,
      amount: item.amount, description: item.description,
      priority: item.priority as any, status: "pending" as any,
      workflow_steps: workflowSteps as any,
      current_workflow_step: 0,
      company_id: user?.companyId || null,
    }).select().single();

    if (data && !error) {
      setApprovalItems(prev => [{
        ...item, id: data.id,
        submitted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "pending", currentStep: 0,
        steps: workflowSteps as ApprovalStep[],
      }, ...prev]);

      // Notify the role required for the first step
      const firstStepRole = stages[0]?.role || "manager";
      const roleLabel = { super_admin: "Super Admin", admin: "Admin", manager: "Manager", sales_rep: "Sales Rep", warehouse_staff: "Warehouse Staff", viewer: "Viewer" }[firstStepRole] || "Manager";

      addNotification({
        type: "approval",
        title: `New approval request: ${item.title}`,
        message: `${item.requester} submitted a ${item.type.replace(/_/g, " ")} for review`,
        link: "/approvals",
        targetRoles: ["Super Admin", "Admin", roleLabel],
        createdBy: item.requester,
      });
    }
  }, [user, addNotification, getStagesForType]);

  const approveItem = useCallback(async (id: string, comment?: string) => {
    const item = approvalItems.find(a => a.id === id);
    if (!item || item.status !== "pending") return;

    // Check if user can approve
    if (!canApproveItem(item)) {
      return; // UI should prevent this, but double-check
    }

    const newSteps = [...item.steps];
    const currentIdx = item.currentStep;
    
    // Mark current step as approved
    newSteps[currentIdx] = {
      ...newSteps[currentIdx],
      status: "approved",
      approver: user?.name || "Admin",
      date: new Date().toLocaleDateString(),
      comment: comment || null,
    };

    const nextStep = currentIdx + 1;
    const isComplete = nextStep >= newSteps.length;
    const newStatus = isComplete ? "approved" : "pending";

    await supabase.from("approvals").update({
      status: newStatus as any,
      reviewed_by: user?.id || null,
      review_notes: comment || null,
      workflow_steps: newSteps as any,
      current_workflow_step: nextStep,
    }).eq("id", id);

    setApprovalItems(prev => prev.map(a => {
      if (a.id !== id) return a;
      if (isComplete) {
        approvalHandlers.forEach(h => h(a.id, a.type, a.sourceId, true));
      }
      return { ...a, steps: newSteps, status: newStatus as ApprovalItem["status"], currentStep: nextStep };
    }));

    if (isComplete) {
      addNotification({ type: "approval", title: "Approval completed", message: `${item.title} has been fully approved`, link: "/approvals" });
    } else {
      // Notify the next step's role
      const nextStepRole = newSteps[nextStep]?.role || "manager";
      const roleLabel = { super_admin: "Super Admin", admin: "Admin", manager: "Manager", sales_rep: "Sales Rep", warehouse_staff: "Warehouse Staff", viewer: "Viewer" }[nextStepRole] || "Manager";
      
      addNotification({
        type: "approval",
        title: `Step approved: ${item.title}`,
        message: `Step ${currentIdx + 1} approved. Awaiting ${roleLabel} review.`,
        link: "/approvals",
        targetRoles: ["Super Admin", "Admin", roleLabel],
      });
    }
  }, [user, approvalItems, approvalHandlers, addNotification, canApproveItem]);

  const rejectItem = useCallback(async (id: string, comment?: string) => {
    const item = approvalItems.find(a => a.id === id);
    if (!item || item.status !== "pending") return;

    // Check if user can reject
    if (!canApproveItem(item)) {
      return;
    }

    const newSteps = [...item.steps];
    newSteps[item.currentStep] = {
      ...newSteps[item.currentStep],
      status: "rejected",
      approver: user?.name || "Admin",
      date: new Date().toLocaleDateString(),
      comment: comment || "Rejected",
    };

    await supabase.from("approvals").update({
      status: "rejected" as any,
      reviewed_by: user?.id || null,
      review_notes: comment || "Rejected",
      workflow_steps: newSteps as any,
    }).eq("id", id);

    setApprovalItems(prev => prev.map(a => {
      if (a.id !== id) return a;
      approvalHandlers.forEach(h => h(a.id, a.type, a.sourceId, false));
      return { ...a, steps: newSteps, status: "rejected" as const };
    }));

    addNotification({ type: "approval", title: "Approval rejected", message: comment || "Request has been rejected", link: "/approvals" });
  }, [user, approvalItems, approvalHandlers, addNotification, canApproveItem]);

  const onApprovalComplete = useCallback(() => {}, []);
  const registerApprovalHandler = useCallback((handler: (id: string, type: string, sourceId: string, approved: boolean) => void) => {
    setApprovalHandlers(prev => [...prev, handler]);
  }, []);

  return (
    <AppEventsContext.Provider value={{
      notifications, addNotification, markRead, markAllRead, deleteNotification, unreadCount,
      getNotificationsForRole,
      approvalItems, addApprovalItem, approveItem, rejectItem, canApproveItem,
      onApprovalComplete, registerApprovalHandler,
      workflowConfig, getStagesForType,
    }}>
      {children}
    </AppEventsContext.Provider>
  );
}

export function useAppEvents() {
  return useContext(AppEventsContext);
}
