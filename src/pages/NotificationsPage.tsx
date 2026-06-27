import { useState, useMemo, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Bell, CheckCircle2, AlertTriangle, MessageSquare, FileText, Package, Clock,
  Trash2, X, Filter, ExternalLink, ShoppingCart, Shield, TrendingUp, Truck, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

type NotificationType = "approval" | "inventory" | "chat" | "workflow" | "sales" | "supply" | "document" | "system" | "security";

interface DBNotification {
  id: string; type: NotificationType; title: string; message: string;
  time: string; read: boolean; link?: string;
  targetRoles?: string[]; createdBy?: string;
}

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  approval: { icon: CheckCircle2, color: "text-success" },
  inventory: { icon: Package, color: "text-warning" },
  chat: { icon: MessageSquare, color: "text-info" },
  workflow: { icon: FileText, color: "text-primary" },
  sales: { icon: TrendingUp, color: "text-success" },
  supply: { icon: Truck, color: "text-primary" },
  document: { icon: FileText, color: "text-info" },
  system: { icon: Bell, color: "text-muted-foreground" },
  security: { icon: Shield, color: "text-destructive" },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data && !error) {
      setNotifications(data.map(n => ({
        id: n.id, type: n.type as NotificationType, title: n.title,
        message: n.message || "", read: n.read || false,
        time: new Date(n.created_at).toLocaleString(),
        link: n.link || undefined,
        targetRoles: n.target_roles || undefined,
        createdBy: n.created_by_name || undefined,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notif-page-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as any;
        setNotifications(prev => [{
          id: n.id, type: n.type, title: n.title, message: n.message || "",
          read: false, time: "Just now", link: n.link || undefined,
          targetRoles: n.target_roles || undefined, createdBy: n.created_by_name || undefined,
        }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = useMemo(() =>
    filter === "all" ? notifications :
    filter === "unread" ? notifications.filter(n => !n.read) :
    notifications.filter(n => n.type === filter),
  [notifications, filter]);

  const filters = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "approval", label: "Approvals" },
    { key: "inventory", label: "Inventory" },
    { key: "chat", label: "Chat" },
    { key: "workflow", label: "Workflows" },
    { key: "sales", label: "Sales" },
    { key: "supply", label: "Supplier" },
  ];

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              {user && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{user.role}</span>}
            </p>
          </div>
          <button onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">Mark all as read</button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No notifications</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => {
              const tc = typeConfig[notif.type];
              const Icon = tc.icon;
              return (
                <div key={notif.id}
                  onClick={() => markRead(notif.id)}
                  className={`glass-card rounded-xl p-4 flex items-start gap-3 transition-all hover:stat-glow cursor-pointer group ${!notif.read ? "border-l-2 border-l-primary" : ""}`}>
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${tc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.read ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {notif.title}
                    </p>
                    {notif.message && <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{notif.time}</span>
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{notif.type}</span>
                      {notif.createdBy && <span className="text-[10px] text-muted-foreground">by {notif.createdBy}</span>}
                      {notif.targetRoles && notif.targetRoles.length > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {notif.targetRoles.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {notif.link && (
                      <Link to={notif.link} onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md hover:bg-muted">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="p-1.5 rounded-md hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
