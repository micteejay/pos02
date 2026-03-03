import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface AppSettings {
  appName: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  receiptStyle: string;
  receiptHeader: string;
  receiptFooter: string;
  receiptReturnPolicy: string;
  paperWidth: string;
  fontSize: string;
  showQRCode: boolean;
  language: string;
  timezone: string;
}

export type Permission =
  | "users.view" | "users.create" | "users.edit" | "users.delete"
  | "roles.view" | "roles.create" | "roles.edit" | "roles.delete"
  | "inventory.view" | "inventory.create" | "inventory.edit" | "inventory.delete"
  | "sales.view" | "sales.create" | "sales.edit" | "sales.delete"
  | "pos.view" | "pos.create"
  | "supply.view" | "supply.create" | "supply.edit" | "supply.approve"
  | "workflows.view" | "workflows.create" | "workflows.approve" | "workflows.delete"
  | "approvals.view" | "approvals.approve" | "approvals.reject"
  | "reports.view" | "reports.export"
  | "organization.view" | "organization.create" | "organization.edit" | "organization.delete"
  | "documents.view" | "documents.create" | "documents.edit" | "documents.delete"
  | "settings.view" | "settings.edit"
  | "audit.view"
  | "chat.view" | "chat.create";

export interface AppRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  color: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  lastActive: string;
  department: string;
  store: string;
}

const allPermissions: Permission[] = [
  "users.view","users.create","users.edit","users.delete",
  "roles.view","roles.create","roles.edit","roles.delete",
  "inventory.view","inventory.create","inventory.edit","inventory.delete",
  "sales.view","sales.create","sales.edit","sales.delete",
  "pos.view","pos.create",
  "supply.view","supply.create","supply.edit","supply.approve",
  "workflows.view","workflows.create","workflows.approve","workflows.delete",
  "approvals.view","approvals.approve","approvals.reject",
  "reports.view","reports.export",
  "organization.view","organization.create","organization.edit","organization.delete",
  "documents.view","documents.create","documents.edit","documents.delete",
  "settings.view","settings.edit",
  "audit.view",
  "chat.view","chat.create",
];

const defaultRoles: AppRole[] = [
  { id: "r1", name: "Super Admin", description: "Full system access with all permissions", permissions: [...allPermissions], isSystem: true, color: "bg-destructive/10 text-destructive" },
  { id: "r2", name: "Admin", description: "Administrative access excluding system settings", permissions: allPermissions.filter(p => !p.startsWith("roles.")), isSystem: true, color: "bg-primary/10 text-primary" },
  { id: "r3", name: "Manager", description: "Manage operations, sales, and inventory", permissions: ["users.view","inventory.view","inventory.create","inventory.edit","sales.view","sales.create","sales.edit","pos.view","pos.create","supply.view","supply.create","supply.edit","supply.approve","workflows.view","workflows.create","workflows.approve","approvals.view","approvals.approve","approvals.reject","reports.view","reports.export","organization.view","documents.view","documents.create","documents.edit","chat.view","chat.create","audit.view"], isSystem: false, color: "bg-info/10 text-info" },
  { id: "r4", name: "Sales Rep", description: "Point of sale and sales management", permissions: ["sales.view","sales.create","pos.view","pos.create","inventory.view","reports.view","chat.view","chat.create","documents.view"], isSystem: false, color: "bg-success/10 text-success" },
  { id: "r5", name: "Warehouse Staff", description: "Inventory and supply chain operations", permissions: ["inventory.view","inventory.create","inventory.edit","supply.view","supply.create","workflows.view","documents.view","chat.view","chat.create"], isSystem: false, color: "bg-warning/10 text-warning" },
  { id: "r6", name: "Viewer", description: "Read-only access to all modules", permissions: allPermissions.filter(p => p.endsWith(".view")), isSystem: false, color: "bg-muted text-muted-foreground" },
];

const defaultUsers: AppUser[] = [
  { id: "u1", name: "Sarah Chen", email: "sarah@enterprise.com", avatar: "SC", role: "Super Admin", status: "active", lastActive: "2 min ago", department: "Technology", store: "Main HQ" },
  { id: "u2", name: "Mike Ross", email: "mike@enterprise.com", avatar: "MR", role: "Manager", status: "active", lastActive: "15 min ago", department: "Operations", store: "West Store" },
  { id: "u3", name: "Lisa Park", email: "lisa@enterprise.com", avatar: "LP", role: "Manager", status: "active", lastActive: "1 hr ago", department: "Inventory", store: "Main HQ" },
  { id: "u4", name: "James Wilson", email: "james@enterprise.com", avatar: "JW", role: "Viewer", status: "inactive", lastActive: "2 days ago", department: "Finance", store: "Main HQ" },
  { id: "u5", name: "Emma Davis", email: "emma@enterprise.com", avatar: "ED", role: "Sales Rep", status: "active", lastActive: "5 min ago", department: "Sales", store: "East Store" },
  { id: "u6", name: "Tom Harris", email: "tom@enterprise.com", avatar: "TH", role: "Sales Rep", status: "active", lastActive: "30 min ago", department: "Sales", store: "South Hub" },
  { id: "u7", name: "Anna Kowalski", email: "anna@enterprise.com", avatar: "AK", role: "Admin", status: "active", lastActive: "10 min ago", department: "Technology", store: "Main HQ" },
  { id: "u8", name: "Robert Chen", email: "robert@enterprise.com", avatar: "RC", role: "Warehouse Staff", status: "active", lastActive: "45 min ago", department: "Operations", store: "Main HQ" },
];

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  roles: AppRole[];
  addRole: (role: Omit<AppRole, "id">) => void;
  updateRole: (id: string, updates: Partial<AppRole>) => void;
  deleteRole: (id: string) => void;
  users: AppUser[];
  addUser: (user: Omit<AppUser, "id">) => void;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  currentUser: AppUser;
  hasPermission: (permission: Permission) => boolean;
  allPermissions: Permission[];
  formatCurrency: (amount: number) => string;
}

const AppSettingsContext = createContext<AppSettingsContextType>(null!);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem("app-settings");
    return stored ? JSON.parse(stored) : {
      appName: "Enterprise Hub",
      currency: "USD",
      currencySymbol: "$",
      taxRate: 8,
      receiptStyle: "modern",
      receiptHeader: "Enterprise Hub",
      receiptFooter: "Thank you for your purchase!",
      receiptReturnPolicy: "Returns accepted within 30 days with receipt.",
      paperWidth: "80mm",
      fontSize: "Medium",
      showQRCode: true,
      language: "en",
      timezone: "UTC-05:00 Eastern",
    };
  });

  const [roles, setRoles] = useState<AppRole[]>(() => {
    const stored = localStorage.getItem("app-roles");
    return stored ? JSON.parse(stored) : defaultRoles;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const stored = localStorage.getItem("app-users");
    return stored ? JSON.parse(stored) : defaultUsers;
  });

  const currentUser = users[0]; // Simulated logged-in user (Super Admin)

  const currentRole = roles.find(r => r.name === currentUser.role);

  const hasPermission = useCallback((permission: Permission) => {
    if (!currentRole) return false;
    return currentRole.permissions.includes(permission);
  }, [currentRole]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem("app-settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const addRole = useCallback((role: Omit<AppRole, "id">) => {
    setRoles(prev => {
      const next = [...prev, { ...role, id: `r${Date.now()}` }];
      localStorage.setItem("app-roles", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateRole = useCallback((id: string, updates: Partial<AppRole>) => {
    setRoles(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      localStorage.setItem("app-roles", JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteRole = useCallback((id: string) => {
    setRoles(prev => {
      const next = prev.filter(r => r.id !== id);
      localStorage.setItem("app-roles", JSON.stringify(next));
      return next;
    });
  }, []);

  const addUser = useCallback((user: Omit<AppUser, "id">) => {
    setUsers(prev => {
      const next = [...prev, { ...user, id: `u${Date.now()}` }];
      localStorage.setItem("app-users", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<AppUser>) => {
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      localStorage.setItem("app-users", JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => {
      const next = prev.filter(u => u.id !== id);
      localStorage.setItem("app-users", JSON.stringify(next));
      return next;
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `${settings.currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [settings.currencySymbol]);

  return (
    <AppSettingsContext.Provider value={{
      settings, updateSettings,
      roles, addRole, updateRole, deleteRole,
      users, addUser, updateUser, deleteUser,
      currentUser, hasPermission, allPermissions,
      formatCurrency,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
