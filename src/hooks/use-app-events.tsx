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

const defaultNotifications: AppNotification[] = [
  { id: "n1", type: "approval", title: "Purchase Order #PO-5003 awaiting approval", message: "PowerMax Supply order for $8,050 needs Finance review", time: "2 min ago", read: false, link: "/approvals" },
  { id: "n2", type: "inventory", title: "Low stock alert: Widget Alpha (12 units)", message: "Widget Alpha has fallen below reorder point of 50 units at Main HQ", time: "15 min ago", read: false, link: "/inventory" },
  { id: "n3", type: "chat", title: "Sarah Chen mentioned you in #general", message: "Let's sync up after lunch to finalize the approvals.", time: "32 min ago", read: false, link: "/chat" },
  { id: "n4", type: "workflow", title: "Workflow WF-4521 advanced to Finance Review", message: "Purchase Order - Office Supplies is now at step 2 of 3", time: "1 hr ago", read: true, link: "/workflows" },
  { id: "n5", type: "supply", title: "Shipment PO-5002 is in transit", message: "Global Sensors order shipped, ETA Feb 18", time: "2 hrs ago", read: true, link: "/supply" },
  { id: "n6", type: "sales", title: "Daily sales target reached", message: "Main HQ has exceeded daily sales target by 12%", time: "3 hrs ago", read: true, link: "/sales" },
  { id: "n7", type: "security", title: "Failed login attempt detected", message: "Unknown IP attempted login 3 times — account locked", time: "5 hrs ago", read: true, link: "/audit" },
];

const defaultApprovals: ApprovalItem[] = [
  {
    id: "APR-3001", title: "PO-5003: PowerMax Supply Equipment", type: "purchase_order", sourceId: "PO-5003",
    requester: "David Kim", department: "Operations", amount: 8050, description: "Q1 equipment refresh — PSU 750W Gold ×50, Motor 500W ×30",
    submitted: "Feb 12, 2026", priority: "medium", status: "pending", currentStep: 0,
    steps: [
      { role: "Operations Manager", approver: null, status: "pending", date: null, comment: null },
      { role: "Finance Director", approver: null, status: "pending", date: null, comment: null },
    ],
  },
  {
    id: "APR-3002", title: "Stock Transfer: PCB Board Rev3 ×100", type: "stock_transfer", sourceId: "TRF-4488",
    requester: "David Kim", department: "Inventory", amount: null, description: "Transfer 100 PCB Board Rev3 from South Hub to Main HQ",
    submitted: "Feb 13, 2026", priority: "low", status: "pending", currentStep: 0,
    steps: [
      { role: "Inventory Manager", approver: null, status: "pending", date: null, comment: null },
      { role: "Regional Manager", approver: null, status: "pending", date: null, comment: null },
    ],
  },
  {
    id: "APR-3003", title: "Q1 Marketing Budget Increase", type: "expense", sourceId: "EXP-101",
    requester: "Lisa Park", department: "Marketing", amount: 24500, description: "Request to increase Q1 marketing budget for new campaign launch.",
    submitted: "Feb 14, 2026", priority: "high", status: "pending", currentStep: 1,
    steps: [
      { role: "Department Head", approver: "James Wilson", status: "approved", date: "Feb 14, 2026", comment: "Aligned with growth targets." },
      { role: "Finance Manager", approver: null, status: "pending", date: null, comment: null },
      { role: "CFO", approver: null, status: "pending", date: null, comment: null },
    ],
  },
  {
    id: "APR-3004", title: "Annual Compliance Report Sign-off", type: "document", sourceId: "DOC-501",
    requester: "Maria Garcia", department: "Legal", amount: null, description: "Annual compliance report requiring executive sign-off before filing deadline.",
    submitted: "Feb 12, 2026", priority: "high", status: "pending", currentStep: 1,
    steps: [
      { role: "Legal Counsel", approver: "Tom Reed", status: "approved", date: "Feb 12, 2026", comment: "Reviewed and compliant." },
      { role: "VP Operations", approver: null, status: "pending", date: null, comment: null },
      { role: "CEO", approver: null, status: "pending", date: null, comment: null },
    ],
  },
  {
    id: "APR-3005", title: "New POS Terminal Deployment", type: "purchase_order", sourceId: "PO-5010",
    requester: "Frank Kim", department: "Sales", amount: 8900, description: "Deploy 4 new POS terminals across Main HQ and West Store.",
    submitted: "Feb 10, 2026", priority: "medium", status: "approved", currentStep: 2,
    steps: [
      { role: "Store Manager", approver: "Alice Chen", status: "approved", date: "Feb 10, 2026", comment: "Needed for holiday rush." },
      { role: "IT Director", approver: "Bob Tran", status: "approved", date: "Feb 11, 2026", comment: "Compatible with current infrastructure." },
    ],
  },
  {
    id: "APR-3006", title: "Employee Reimbursement — Travel", type: "expense", sourceId: "EXP-102",
    requester: "Grace Wu", department: "Sales", amount: 1250, description: "Travel reimbursement for client visit to Chicago office.",
    submitted: "Feb 9, 2026", priority: "low", status: "rejected", currentStep: 1,
    steps: [
      { role: "Department Head", approver: "Frank Kim", status: "approved", date: "Feb 9, 2026", comment: null },
      { role: "Finance Manager", approver: "Diana Lee", status: "rejected", date: "Feb 10, 2026", comment: "Missing receipts for hotel stay. Please resubmit." },
    ],
  },
];

export function AppEventsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(defaultNotifications);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>(defaultApprovals);
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
        // Fire approval handlers
        approvalHandlers.forEach(h => h(item.id, item.type, item.sourceId, true));
        addNotification({
          type: "approval",
          title: `${item.title} — Approved`,
          message: `All approval steps completed successfully`,
          link: "/approvals",
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
