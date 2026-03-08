import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
  logoUrl: string;
}

export type Permission =
  | "users.view" | "users.create" | "users.edit" | "users.delete"
  | "roles.view" | "roles.create" | "roles.edit" | "roles.delete"
  | "inventory.view" | "inventory.create" | "inventory.edit" | "inventory.delete"
  | "inventory.stock" | "inventory.warehouses" | "inventory.transfers" | "inventory.categories"
  | "sales.view" | "sales.create" | "sales.edit" | "sales.delete"
  | "sales.transactions" | "sales.analytics" | "sales.reps"
  | "pos.view" | "pos.create"
  | "supply.view" | "supply.create" | "supply.edit" | "supply.approve"
  | "supply.orders" | "supply.suppliers"
  | "workflows.view" | "workflows.create" | "workflows.approve" | "workflows.delete"
  | "approvals.view" | "approvals.approve" | "approvals.reject"
  | "approvals.pending" | "approvals.history"
  | "reports.view" | "reports.export"
  | "reports.overview" | "reports.sales" | "reports.inventory" | "reports.gainloss" | "reports.eod" | "reports.expenses" | "reports.operations"
  | "organization.view" | "organization.create" | "organization.edit" | "organization.delete"
  | "organization.stores" | "organization.warehouses" | "organization.departments" | "organization.hierarchy"
  | "documents.view" | "documents.create" | "documents.edit" | "documents.delete"
  | "settings.view" | "settings.edit"
  | "settings.general" | "settings.receipt" | "settings.integrations" | "settings.security"
  | "audit.view"
  | "chat.view" | "chat.create"
  | "notifications.view"
  | "dashboard.view"
  | "pages.dashboard" | "pages.inventory" | "pages.sales" | "pages.pos" | "pages.supply"
  | "pages.workflows" | "pages.approvals" | "pages.reports" | "pages.organization"
  | "pages.documents" | "pages.chat" | "pages.users" | "pages.settings" | "pages.audit"
  | "pages.notifications"
  | "pages.inventory.stock" | "pages.inventory.warehouses" | "pages.inventory.transfers" | "pages.inventory.categories"
  | "pages.sales.transactions" | "pages.sales.analytics" | "pages.sales.reps"
  | "pages.supply.orders" | "pages.supply.suppliers"
  | "pages.approvals.pending" | "pages.approvals.history"
  | "pages.reports.overview" | "pages.reports.sales" | "pages.reports.inventory" | "pages.reports.gainloss" | "pages.reports.eod" | "pages.reports.expenses" | "pages.reports.operations"
  | "pages.organization.stores" | "pages.organization.warehouses" | "pages.organization.departments" | "pages.organization.hierarchy"
  | "pages.settings.general" | "pages.settings.receipt" | "pages.settings.integrations" | "pages.settings.security"
  | "pages.users.users" | "pages.users.roles" | "pages.users.permissions";

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

export interface IntegrationConfig {
  name: string;
  description: string;
  connected: boolean;
  icon: string;
  category: "payment" | "communication" | "accounting" | "other";
  configFields: string[];
  configValues: Record<string, string>;
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
  "approvals.pending","approvals.history",
  "reports.view","reports.export",
  "reports.overview","reports.sales","reports.inventory","reports.gainloss","reports.eod","reports.expenses","reports.operations",
  "organization.view","organization.create","organization.edit","organization.delete",
  "organization.stores","organization.warehouses","organization.departments","organization.hierarchy",
  "documents.view","documents.create","documents.edit","documents.delete",
  "settings.view","settings.edit",
  "settings.general","settings.receipt","settings.integrations","settings.security",
  "audit.view",
  "chat.view","chat.create",
  "notifications.view","dashboard.view",
  "inventory.stock","inventory.warehouses","inventory.transfers","inventory.categories",
  "sales.transactions","sales.analytics","sales.reps",
  "supply.orders","supply.suppliers",
  "pages.dashboard","pages.inventory","pages.sales","pages.pos","pages.supply",
  "pages.workflows","pages.approvals","pages.reports","pages.organization",
  "pages.documents","pages.chat","pages.users","pages.settings","pages.audit",
  "pages.notifications",
  "pages.inventory.stock","pages.inventory.warehouses","pages.inventory.transfers","pages.inventory.categories",
  "pages.sales.transactions","pages.sales.analytics","pages.sales.reps",
  "pages.supply.orders","pages.supply.suppliers",
  "pages.approvals.pending","pages.approvals.history",
  "pages.reports.overview","pages.reports.sales","pages.reports.inventory","pages.reports.gainloss","pages.reports.eod","pages.reports.expenses","pages.reports.operations",
  "pages.organization.stores","pages.organization.warehouses","pages.organization.departments","pages.organization.hierarchy",
  "pages.settings.general","pages.settings.receipt","pages.settings.integrations","pages.settings.security",
  "pages.users.users","pages.users.roles","pages.users.permissions",
];

const defaultSettings: AppSettings = {
  appName: "Enterprise Hub", currency: "USD", currencySymbol: "$", taxRate: 8,
  receiptStyle: "modern", receiptHeader: "", receiptFooter: "Thank you for your purchase!",
  receiptReturnPolicy: "Returns accepted within 30 days with receipt.",
  paperWidth: "80mm", fontSize: "Medium", showQRCode: true, language: "en",
  timezone: "UTC-05:00 Eastern", logoUrl: "",
};

const defaultIntegrations: IntegrationConfig[] = [
  { name: "Stripe", description: "Payment processing and billing", connected: false, icon: "💳", category: "payment", configFields: ["API Key", "Secret Key", "Webhook Secret"], configValues: {} },
  { name: "Paystack", description: "African payment processing", connected: false, icon: "💰", category: "payment", configFields: ["Public Key", "Secret Key"], configValues: {} },
  { name: "Flutterwave", description: "Pan-African payments", connected: false, icon: "🦋", category: "payment", configFields: ["Public Key", "Secret Key", "Encryption Key"], configValues: {} },
  { name: "SendGrid", description: "Transactional email delivery", connected: false, icon: "📧", category: "communication", configFields: ["API Key", "From Email", "From Name"], configValues: {} },
  { name: "Twilio", description: "SMS and voice communications", connected: false, icon: "📱", category: "communication", configFields: ["Account SID", "Auth Token", "Phone Number"], configValues: {} },
  { name: "WhatsApp Business", description: "WhatsApp messaging API", connected: false, icon: "💬", category: "communication", configFields: ["Phone Number ID", "Access Token", "Business Account ID"], configValues: {} },
  { name: "SMTP Email", description: "Custom SMTP email server", connected: false, icon: "✉️", category: "communication", configFields: ["Host", "Port", "Username", "Password"], configValues: {} },
  { name: "QuickBooks", description: "Accounting and bookkeeping", connected: false, icon: "📊", category: "accounting", configFields: ["Client ID", "Client Secret", "Realm ID"], configValues: {} },
  { name: "Xero", description: "Cloud-based accounting", connected: false, icon: "📒", category: "accounting", configFields: ["Client ID", "Client Secret", "Tenant ID"], configValues: {} },
  { name: "Slack", description: "Team notifications and alerts", connected: false, icon: "🔔", category: "communication", configFields: ["Webhook URL", "Channel"], configValues: {} },
  { name: "Shopify", description: "E-commerce platform sync", connected: false, icon: "🛒", category: "other", configFields: ["Store URL", "API Key", "Secret Key"], configValues: {} },
];

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  roles: AppRole[];
  addRole: (role: Omit<AppRole, "id">) => void;
  updateRole: (id: string, updates: Partial<AppRole>) => void;
  deleteRole: (id: string) => void;
  users: AppUser[];
  addUser: (user: Omit<AppUser, "id"> & { password?: string; username?: string }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  currentUser: AppUser;
  hasPermission: (permission: Permission) => boolean;
  allPermissions: Permission[];
  formatCurrency: (amount: number) => string;
  integrations: IntegrationConfig[];
  connectIntegration: (name: string, configValues: Record<string, string>) => void;
  disconnectIntegration: (name: string) => void;
  isIntegrationConnected: (name: string) => boolean;
  getIntegrationConfig: (name: string) => IntegrationConfig | undefined;
}

const AppSettingsContext = createContext<AppSettingsContextType>(null!);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(defaultIntegrations);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<Permission[]>([]);

  // Fetch roles, users, settings, integrations from Supabase
  useEffect(() => {
    if (!authUser) return;

    const fetchData = async () => {
      // Fetch roles
      const { data: rolesData } = await supabase.from("roles").select("*").order("name");
      if (rolesData) {
        setRoles(rolesData.map(r => ({
          id: r.id, name: r.name, description: r.description || "",
          permissions: (r.permissions || []) as Permission[],
          isSystem: r.is_system, color: r.color || "bg-muted text-muted-foreground",
        })));
      }

      // Fetch users (profiles + roles + department + store)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*, user_roles(role_id, roles(name)), departments(name), stores(name), user_store_assignments(store_id, stores(name))")
        .order("name");
      if (profilesData) {
        setUsers(profilesData.map((p: any) => {
          const storeName = p.stores?.name || p.user_store_assignments?.[0]?.stores?.name || "";
          const deptName = p.departments?.name || "";
          return {
            id: p.id, name: p.name || "Unknown", email: p.email || "",
            avatar: p.avatar || (p.name || "U").charAt(0).toUpperCase(),
            role: p.user_roles?.[0]?.roles?.name || "Viewer",
            status: p.status as AppUser["status"],
            lastActive: p.last_active || "",
            department: deptName, store: storeName,
          };
        }));
      }

      // Fetch current user permissions
      const { data: perms } = await supabase.rpc("get_user_permissions", { _user_id: authUser.id });
      if (perms) setCurrentUserPermissions(perms as Permission[]);

      // Fetch app settings
      const { data: settingsData } = await supabase.from("app_settings").select("*");
      if (settingsData) {
        const parsed: any = {};
        settingsData.forEach((s: any) => {
          try { parsed[s.key] = typeof s.value === "string" ? JSON.parse(s.value) : s.value; }
          catch { parsed[s.key] = s.value; }
        });
        if (parsed.general) {
          const g = parsed.general;
          setSettings(prev => ({
            ...prev,
            appName: g.appName || prev.appName,
            currency: g.currency || prev.currency,
            currencySymbol: g.currencySymbol || prev.currencySymbol,
            taxRate: g.taxRate ?? prev.taxRate,
            language: g.language || prev.language,
            timezone: g.timezone || prev.timezone,
            logoUrl: g.logoUrl || prev.logoUrl,
          }));
        }
        if (parsed.receipt) {
          const r = parsed.receipt;
          setSettings(prev => ({
            ...prev,
            receiptStyle: r.receiptStyle || prev.receiptStyle,
            receiptHeader: r.receiptHeader ?? prev.receiptHeader,
            receiptFooter: r.receiptFooter ?? prev.receiptFooter,
            receiptReturnPolicy: r.receiptReturnPolicy ?? prev.receiptReturnPolicy,
            paperWidth: r.paperWidth || prev.paperWidth,
            fontSize: r.fontSize || prev.fontSize,
            showQRCode: r.showQRCode ?? prev.showQRCode,
          }));
        }
      }

      // Fetch integrations
      const { data: intData } = await supabase.from("integration_configs").select("*");
      if (intData && intData.length > 0) {
        setIntegrations(intData.map(i => ({
          name: i.name, description: i.description || "",
          connected: i.connected, icon: i.icon || "⚙️",
          category: i.category as IntegrationConfig["category"],
          configFields: i.config_fields || [],
          configValues: (i.config_values as Record<string, string>) || {},
        })));
      }
    };

    fetchData();
  }, [authUser]);

  const currentUser: AppUser = users.find(u => u.id === authUser?.id) || {
    id: authUser?.id || "", name: authUser?.name || "User", email: authUser?.email || "",
    avatar: (authUser?.name || "U").charAt(0).toUpperCase(),
    role: authUser?.role || "Viewer", status: "active", lastActive: "Now",
    department: "", store: "",
  };

  const currentRole = roles.find(r => r.name === currentUser.role);

  const hasPermission = useCallback((permission: Permission) => {
    // Check from DB permissions first, fall back to role permissions
    if (currentUserPermissions.length > 0) return currentUserPermissions.includes(permission);
    if (!currentRole) return false;
    return currentRole.permissions.includes(permission);
  }, [currentRole, currentUserPermissions]);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      // Persist to Supabase
      const generalKeys = ["appName", "currency", "currencySymbol", "taxRate", "language", "timezone", "logoUrl"];
      const receiptKeys = ["receiptStyle", "receiptHeader", "receiptFooter", "receiptReturnPolicy", "paperWidth", "fontSize", "showQRCode"];
      const hasGeneral = Object.keys(updates).some(k => generalKeys.includes(k));
      const hasReceipt = Object.keys(updates).some(k => receiptKeys.includes(k));
      if (hasGeneral) {
        const generalValue: any = {};
        generalKeys.forEach(k => { generalValue[k] = (next as any)[k]; });
        supabase.from("app_settings").upsert({ key: "general", value: generalValue, updated_by: authUser?.id || null }, { onConflict: "key" });
      }
      if (hasReceipt) {
        const receiptValue: any = {};
        receiptKeys.forEach(k => { receiptValue[k] = (next as any)[k]; });
        supabase.from("app_settings").upsert({ key: "receipt", value: receiptValue, updated_by: authUser?.id || null }, { onConflict: "key" });
      }
      return next;
    });
  }, [authUser]);

  const addRole = useCallback(async (role: Omit<AppRole, "id">) => {
    const { data, error } = await supabase.from("roles").insert({
      name: role.name, description: role.description,
      permissions: role.permissions, is_system: role.isSystem, color: role.color,
    }).select().single();
    if (data && !error) {
      setRoles(prev => [...prev, { ...role, id: data.id }]);
    }
  }, []);

  const updateRole = useCallback(async (id: string, updates: Partial<AppRole>) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.permissions !== undefined) payload.permissions = updates.permissions;
    if (updates.color !== undefined) payload.color = updates.color;
    await supabase.from("roles").update(payload).eq("id", id);
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRole = useCallback(async (id: string) => {
    await supabase.from("roles").delete().eq("id", id);
    setRoles(prev => prev.filter(r => r.id !== id));
  }, []);

  const addUser = useCallback(async (user: Omit<AppUser, "id"> & { password?: string; username?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await supabase.functions.invoke("create-user", {
        body: {
          username: user.username || user.email,
          password: user.password || "changeme123",
          name: user.name,
          role: user.role,
          department: user.department,
          store: user.store,
        },
      });
      if (res.error) {
        // For non-2xx responses, try to extract the JSON body from the error context
        let msg = "Failed to create user";
        try {
          if (res.error.context) {
            const body = await res.error.context.json();
            if (body?.error) msg = body.error;
          } else if (typeof res.error === "object" && "message" in res.error) {
            msg = res.error.message;
          }
        } catch {
          msg = String(res.error);
        }
        return { success: false, error: msg };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
      const created = res.data;
      setUsers(prev => [...prev, { ...user, id: created.id, email: created.email }]);
      return { success: true };
    } catch (err: any) {
      console.error("Failed to create user:", err);
      return { success: false, error: err?.message || "Failed to create user" };
    }
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<AppUser>) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;
    await supabase.from("profiles").update(payload).eq("id", id);

    // If role changed, update user_roles
    if (updates.role) {
      const role = roles.find(r => r.name === updates.role);
      if (role) {
        await supabase.from("user_roles").delete().eq("user_id", id);
        await supabase.from("user_roles").insert({ user_id: id, role_id: role.id });
      }
    }

    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, [roles]);

  const deleteUser = useCallback(async (id: string) => {
    // Can't delete auth.users from client, but can deactivate
    await supabase.from("profiles").update({ status: "inactive" as any }).eq("id", id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `${settings.currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [settings.currencySymbol]);

  const connectIntegration = useCallback(async (name: string, configValues: Record<string, string>) => {
    await supabase.from("integration_configs").update({ connected: true, config_values: configValues }).eq("name", name);
    setIntegrations(prev => prev.map(i => i.name === name ? { ...i, connected: true, configValues } : i));
  }, []);

  const disconnectIntegration = useCallback(async (name: string) => {
    await supabase.from("integration_configs").update({ connected: false, config_values: {} }).eq("name", name);
    setIntegrations(prev => prev.map(i => i.name === name ? { ...i, connected: false, configValues: {} } : i));
  }, []);

  const isIntegrationConnected = useCallback((name: string) => {
    return integrations.find(i => i.name === name)?.connected || false;
  }, [integrations]);

  const getIntegrationConfig = useCallback((name: string) => {
    return integrations.find(i => i.name === name);
  }, [integrations]);

  return (
    <AppSettingsContext.Provider value={{
      settings, updateSettings,
      roles, addRole, updateRole, deleteRole,
      users, addUser, updateUser, deleteUser,
      currentUser, hasPermission, allPermissions,
      formatCurrency,
      integrations, connectIntegration, disconnectIntegration, isIntegrationConnected, getIntegrationConfig,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
