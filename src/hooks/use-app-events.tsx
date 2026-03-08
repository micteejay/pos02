import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// Global event/notification system that links all modules together

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
  // Role-based visibility
  targetRoles?: string[]; // if set, only these roles see the notification
  targetUserId?: string;  // if set, only this user sees it
  createdBy?: string;     // who triggered this notification
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

  // Cross-module approval items
  approvalItems: ApprovalItem[];
  addApprovalItem: (item: Omit<ApprovalItem, "id" | "submitted" | "status" | "currentStep" | "steps">) => void;
  approveItem: (id: string, comment?: string) => void;
  rejectItem: (id: string, comment?: string) => void;

  // Event handlers that other modules register
  onApprovalComplete: (id: string, type: string, approved: boolean) => void;
  registerApprovalHandler: (handler: (id: string, type: string, sourceId: string, approved: boolean) => void) => void;
}

const AppEventsContext = createContext<AppEventsContextType>(null!);

export function AppEventsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [approvalHandlers, setApprovalHandlers] = useState<((id: string, type: string, sourceId: string, approved: boolean) => void)[]>([]);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "time" | "read">) => {
    const newNotif: AppNotification = {
      ...n,
      id: `n-${Date.now()}`,
      time: "Just now",
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Filter notifications by role / userId
  const getNotificationsForRole = useCallback((role: string, userId?: string) => {
    return notifications.filter(n => {
      // If notification has targetRoles, user must match
      if (n.targetRoles && n.targetRoles.length > 0) {
        if (!n.targetRoles.includes(role) && !(n.targetUserId && n.targetUserId === userId)) {
          return false;
        }
      }
      // If notification is targeted to a specific user
      if (n.targetUserId && n.targetUserId !== userId) {
        return false;
      }
      return true;
    });
  }, [notifications]);

  const addApprovalItem = useCallback((item: Omit<ApprovalItem, "id" | "submitted" | "status" | "currentStep" | "steps">) => {
    const newItem: ApprovalItem = {
      ...item,
      id: `APR-${3100 + Math.floor(Math.random() * 900)}`,
      submitted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "pending",
      currentStep: 0,
      steps: [
        { role: "Manager Review", approver: null, status: "pending", date: null, comment: null },
        { role: "Director Approval", approver: null, status: "pending", date: null, comment: null },
      ],
    };
    setApprovalItems(prev => [newItem, ...prev]);
    addNotification({
      type: "approval",
      title: `New approval request: ${item.title}`,
      message: `${item.requester} submitted a ${item.type.replace(/_/g, " ")} for review`,
      link: "/approvals",
      targetRoles: ["Super Admin", "Admin", "Manager"],
      createdBy: item.requester,
    });
  }, [addNotification]);

  const approveItem = useCallback((id: string, comment?: string) => {
    setApprovalItems(prev => prev.map(item => {
      if (item.id !== id || item.status !== "pending") return item;
      const newSteps = [...item.steps];
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      newSteps[item.currentStep] = { ...newSteps[item.currentStep], status: "approved", approver: "You", date: now, comment: comment || null };
      const nextStep = item.currentStep + 1;
      const isComplete = nextStep >= newSteps.length;
      const newStatus = isComplete ? "approved" as const : "pending" as const;

      if (isComplete) {
        approvalHandlers.forEach(h => h(item.id, item.type, item.sourceId, true));
        addNotification({
          type: "approval",
          title: `${item.title} — Approved`,
          message: `All approval steps completed successfully`,
          link: "/approvals",
          targetRoles: ["Super Admin", "Admin", "Manager"],
        });
      }

      return { ...item, steps: newSteps, currentStep: nextStep, status: newStatus };
    }));
  }, [approvalHandlers, addNotification]);

  const rejectItem = useCallback((id: string, comment?: string) => {
    setApprovalItems(prev => prev.map(item => {
      if (item.id !== id || item.status !== "pending") return item;
      const newSteps = [...item.steps];
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      newSteps[item.currentStep] = { ...newSteps[item.currentStep], status: "rejected", approver: "You", date: now, comment: comment || "Rejected" };

      approvalHandlers.forEach(h => h(item.id, item.type, item.sourceId, false));
      addNotification({
        type: "approval",
        title: `${item.title} — Rejected`,
        message: comment || "Request has been rejected",
        link: "/approvals",
        targetRoles: ["Super Admin", "Admin", "Manager"],
      });

      return { ...item, steps: newSteps, status: "rejected" };
    }));
  }, [approvalHandlers, addNotification]);

  const onApprovalComplete = useCallback((id: string, type: string, approved: boolean) => {
    // This is called by the approval system
  }, []);

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
