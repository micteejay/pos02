import AppLayout from "@/components/AppLayout";
import { Users, Shield, Plus, Search, MoreHorizontal, Mail, ChevronDown } from "lucide-react";

const users = [
  { name: "Sarah Chen", email: "sarah@enterprise.com", role: "OrganizationAdmin", status: "active", lastActive: "2 min ago", avatar: "SC" },
  { name: "Mike Ross", email: "mike@enterprise.com", role: "RegionalManager", status: "active", lastActive: "15 min ago", avatar: "MR" },
  { name: "Lisa Park", email: "lisa@enterprise.com", role: "InventoryManager", status: "active", lastActive: "1 hr ago", avatar: "LP" },
  { name: "James Wilson", email: "james@enterprise.com", role: "Accountant", status: "inactive", lastActive: "2 days ago", avatar: "JW" },
  { name: "Emma Davis", email: "emma@enterprise.com", role: "Cashier", status: "active", lastActive: "5 min ago", avatar: "ED" },
  { name: "Tom Harris", email: "tom@enterprise.com", role: "SalesRep", status: "active", lastActive: "30 min ago", avatar: "TH" },
];

const roles = [
  { name: "SuperAdmin", users: 1, permissions: 42, color: "bg-destructive/10 text-destructive" },
  { name: "OrganizationAdmin", users: 2, permissions: 38, color: "bg-primary/10 text-primary" },
  { name: "RegionalManager", users: 4, permissions: 28, color: "bg-info/10 text-info" },
  { name: "StoreManager", users: 8, permissions: 24, color: "bg-success/10 text-success" },
  { name: "Accountant", users: 3, permissions: 15, color: "bg-warning/10 text-warning" },
  { name: "Cashier", users: 12, permissions: 8, color: "bg-muted text-muted-foreground" },
];

export default function UsersPage() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users & Roles</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage user accounts and access control</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            Invite User
          </button>
        </div>

        {/* Roles Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {roles.map((role) => (
            <div key={role.name} className="glass-card rounded-xl p-3 text-center cursor-pointer hover:stat-glow transition-all">
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${role.color}`}>{role.name}</span>
              <p className="text-lg font-bold text-foreground mt-2">{role.users}</p>
              <p className="text-[10px] text-muted-foreground">{role.permissions} permissions</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{users.length} users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input placeholder="Search users..." className="bg-transparent outline-none w-40 text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Role</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Last Active</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-md">{user.role}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${user.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-success" : "bg-muted-foreground/40"}`} />
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{user.lastActive}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><Mail className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><Shield className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
