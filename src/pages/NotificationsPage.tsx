import AppLayout from "@/components/AppLayout";
import { Bell, CheckCircle2, AlertTriangle, MessageSquare, FileText, Package, Clock, Check, X } from "lucide-react";

const notifications = [
  { icon: CheckCircle2, title: "Purchase Order #4521 approved by Finance", time: "2 min ago", read: false, type: "workflow", color: "text-success" },
  { icon: AlertTriangle, title: "Low stock alert: Widget-A has only 12 units remaining", time: "15 min ago", read: false, type: "inventory", color: "text-warning" },
  { icon: MessageSquare, title: "Sarah Chen mentioned you in #sales-team", time: "32 min ago", read: false, type: "chat", color: "text-info" },
  { icon: FileText, title: "Invoice INV-2024-089 requires your signature", time: "1 hr ago", read: true, type: "document", color: "text-primary" },
  { icon: Package, title: "Shipment #8834 delivered to Warehouse B", time: "2 hrs ago", read: true, type: "inventory", color: "text-success" },
  { icon: CheckCircle2, title: "Payroll for January processed successfully", time: "3 hrs ago", read: true, type: "workflow", color: "text-success" },
  { icon: AlertTriangle, title: "Failed login attempt detected from unknown IP", time: "5 hrs ago", read: true, type: "security", color: "text-destructive" },
];

export default function NotificationsPage() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">Stay updated on important events</p>
          </div>
          <button className="text-xs text-primary hover:underline">Mark all as read</button>
        </div>

        <div className="space-y-2">
          {notifications.map((notif, i) => (
            <div
              key={i}
              className={`glass-card rounded-xl p-4 flex items-start gap-3 transition-all hover:stat-glow cursor-pointer ${
                !notif.read ? "border-l-2 border-l-primary" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                <notif.icon className={`w-4 h-4 ${notif.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!notif.read ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {notif.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{notif.time}</span>
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{notif.type}</span>
                </div>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
