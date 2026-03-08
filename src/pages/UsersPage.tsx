import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useAppSettings, Permission, AppRole, AppUser } from "@/hooks/use-app-settings";
import { useSharedData } from "@/hooks/use-shared-data";
import {
  Users, Shield, Plus, Search, MoreHorizontal, Mail, X, Check, Trash2, Edit2,
  ChevronRight, ChevronDown, Lock, Eye, EyeOff, UserPlus, Settings, AlertTriangle,
} from "lucide-react";

type Tab = "users" | "roles" | "permissions";

const permissionGroups: { module: string; perms: Permission[] }[] = [
  { module: "Page Access", perms: ["pages.dashboard","pages.inventory","pages.sales","pages.pos","pages.supply","pages.workflows","pages.approvals","pages.reports","pages.organization","pages.documents","pages.chat","pages.users","pages.settings","pages.audit","pages.notifications"] },
  { module: "Users", perms: ["users.view","users.create","users.edit","users.delete"] },
  { module: "Roles", perms: ["roles.view","roles.create","roles.edit","roles.delete"] },
  { module: "Inventory", perms: ["inventory.view","inventory.create","inventory.edit","inventory.delete"] },
  { module: "Sales", perms: ["sales.view","sales.create","sales.edit","sales.delete"] },
  { module: "POS", perms: ["pos.view","pos.create"] },
  { module: "Supply Chain", perms: ["supply.view","supply.create","supply.edit","supply.approve"] },
  { module: "Workflows", perms: ["workflows.view","workflows.create","workflows.approve","workflows.delete"] },
  { module: "Approvals", perms: ["approvals.view","approvals.approve","approvals.reject"] },
  { module: "Reports", perms: ["reports.view","reports.export"] },
  { module: "Organization", perms: ["organization.view","organization.create","organization.edit","organization.delete"] },
  { module: "Documents", perms: ["documents.view","documents.create","documents.edit","documents.delete"] },
  { module: "Settings", perms: ["settings.view","settings.edit"] },
  { module: "Audit", perms: ["audit.view"] },
  { module: "Chat", perms: ["chat.view","chat.create"] },
  { module: "Notifications", perms: ["notifications.view"] },
  { module: "Dashboard", perms: ["dashboard.view"] },
];

export default function UsersPage() {
  const { users, roles, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, hasPermission } = useAppSettings();
  const { storeNames, departmentNames } = useSharedData();
  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const filteredUsers = useMemo(() =>
    users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())),
  [users, search]);

  const filteredRoles = useMemo(() =>
    roles.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())),
  [roles, search]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "roles", label: "Roles", icon: Shield },
    { key: "permissions", label: "Permission Matrix", icon: Lock },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users & Roles</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage user accounts, roles, and permissions</p>
          </div>
          <div className="flex gap-2">
            {tab === "users" && hasPermission("users.create") && (
              <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <UserPlus className="w-4 h-4" />Add User
              </button>
            )}
            {tab === "roles" && hasPermission("roles.create") && (
              <button onClick={() => setShowAddRole(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" />Create Role
              </button>
            )}
          </div>
        </div>

        {/* Role Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {roles.map((role) => (
            <div key={role.id} className="glass-card rounded-xl p-3 text-center cursor-pointer hover:stat-glow transition-all" onClick={() => { setTab("roles"); setEditingRole(role); }}>
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${role.color}`}>{role.name}</span>
              <p className="text-lg font-bold text-foreground mt-2">{users.filter(u => u.role === role.name).length}</p>
              <p className="text-[10px] text-muted-foreground">{role.permissions.length} perms</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab !== "permissions" && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab}...`} className="pl-9" />
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden sm:table-cell">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Department</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Store</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{user.avatar}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${roles.find(r => r.name === user.role)?.color || "bg-muted text-muted-foreground"}`}>{user.role}</span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-sm text-muted-foreground">{user.department}</td>
                    <td className="px-5 py-3 hidden lg:table-cell text-sm text-muted-foreground">{user.store}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${user.status === "active" ? "text-success" : user.status === "suspended" ? "text-destructive" : "text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-success" : user.status === "suspended" ? "bg-destructive" : "bg-muted-foreground/40"}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hasPermission("users.edit") && (
                          <button onClick={() => setEditingUser(user)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        )}
                        {hasPermission("users.delete") && user.id !== "u1" && (
                          <button onClick={() => deleteUser(user.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Roles Tab */}
        {tab === "roles" && (
          <div className="space-y-3">
            {filteredRoles.map((role) => (
              <div key={role.id} className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.color}`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
                        {role.isSystem && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">System</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <p className="font-semibold text-foreground">{users.filter(u => u.role === role.name).length} users</p>
                      <p className="text-muted-foreground">{role.permissions.length} permissions</p>
                    </div>
                    {hasPermission("roles.edit") && (
                      <button onClick={() => setEditingRole(role)} className="p-1.5 rounded-md hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                    )}
                    {hasPermission("roles.delete") && !role.isSystem && (
                      <button onClick={() => deleteRole(role.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 12).map((p) => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p}</span>
                  ))}
                  {role.permissions.length > 12 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">+{role.permissions.length - 12} more</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Permission Matrix Tab */}
        {tab === "permissions" && (
          <div className="glass-card rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 sticky left-0 bg-card z-10 min-w-[140px]">Permission</th>
                  {roles.map(r => (
                    <th key={r.id} className="text-center font-medium px-3 py-3 min-w-[80px]">
                      <span className={`inline-block px-2 py-0.5 rounded-full ${r.color}`}>{r.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionGroups.map((group) => (
                  <>
                    <tr key={group.module} className="bg-muted/30">
                      <td colSpan={roles.length + 1} className="px-4 py-2 font-semibold text-foreground sticky left-0 bg-muted/30 z-10">{group.module}</td>
                    </tr>
                    {group.perms.map((perm) => (
                      <tr key={perm} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="px-4 py-2 text-muted-foreground sticky left-0 bg-card z-10 font-mono">{perm}</td>
                        {roles.map(r => (
                          <td key={r.id} className="text-center px-3 py-2">
                            {r.permissions.includes(perm) ? (
                              <Check className="w-4 h-4 text-success mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/20 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <Modal title="Add User" onClose={() => setShowAddUser(false)}>
          <AddUserForm roles={roles} storeNames={storeNames} departmentNames={departmentNames} onAdd={(data) => { addUser(data); setShowAddUser(false); }} onCancel={() => setShowAddUser(false)} />
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)}>
          <EditUserForm user={editingUser} roles={roles} storeNames={storeNames} departmentNames={departmentNames} onSave={(updates) => { updateUser(editingUser.id, updates); setEditingUser(null); }} onCancel={() => setEditingUser(null)} />
        </Modal>
      )}

      {/* Add Role Modal */}
      {showAddRole && (
        <Modal title="Create Role" onClose={() => setShowAddRole(false)}>
          <RoleForm onSave={(data) => { addRole(data); setShowAddRole(false); }} onCancel={() => setShowAddRole(false)} />
        </Modal>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <Modal title={`Edit Role: ${editingRole.name}`} onClose={() => setEditingRole(null)}>
          <RoleForm role={editingRole} onSave={(data) => { updateRole(editingRole.id, data); setEditingRole(null); }} onCancel={() => setEditingRole(null)} />
        </Modal>
      )}
    </AppLayout>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddUserForm({ roles, storeNames, departmentNames, onAdd, onCancel }: { roles: AppRole[]; storeNames: string[]; departmentNames: string[]; onAdd: (data: Omit<AppUser, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(roles[2]?.name || ""); const [department, setDepartment] = useState(departmentNames[0] || ""); const [store, setStore] = useState(storeNames[0] || "");
  const passwordError = confirmPassword && password !== confirmPassword ? "Passwords do not match" : password && password.length < 8 ? "Min 8 characters" : "";
  const canSubmit = name && email && password && password.length >= 8 && password === confirmPassword;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Full Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <div className="relative mt-1">
            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-9" placeholder="Min 8 characters" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
              {showPassword ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" placeholder="Confirm password" />
        </div>
      </div>
      {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
      <div><label className="text-xs font-medium text-muted-foreground">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {departmentNames.length === 0 && <option value="">No departments configured</option>}
            {departmentNames.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">Store</label>
          <select value={store} onChange={(e) => setStore(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {storeNames.length === 0 && <option value="">No stores configured</option>}
            {storeNames.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button disabled={!canSubmit} onClick={() => onAdd({ name, email, avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2), role, status: "active", lastActive: "Just now", department, store })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Add User</button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">User will receive login credentials via email</p>
    </div>
  );
}

function EditUserForm({ user, roles, storeNames, departmentNames, onSave, onCancel }: { user: AppUser; roles: AppRole[]; storeNames: string[]; departmentNames: string[]; onSave: (u: Partial<AppUser>) => void; onCancel: () => void }) {
  const [name, setName] = useState(user.name); const [email, setEmail] = useState(user.email); const [role, setRole] = useState(user.role); const [status, setStatus] = useState(user.status); const [department, setDepartment] = useState(user.department); const [store, setStore] = useState(user.store);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Full Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as AppUser["status"])} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {["Operations","Sales","Finance","Technology","Marketing","HR","Inventory","Legal"].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">Store</label>
          <select value={store} onChange={(e) => setStore(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {["Main HQ","West Store","East Store","South Hub"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button onClick={() => onSave({ name, email, avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2), role, status, department, store })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Save Changes</button>
      </div>
    </div>
  );
}

function RoleForm({ role, onSave, onCancel }: { role?: AppRole; onSave: (data: Omit<AppRole, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState(role?.name || ""); const [description, setDescription] = useState(role?.description || ""); const [permissions, setPermissions] = useState<Permission[]>(role?.permissions || []);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const togglePerm = (perm: Permission) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };
  const toggleModule = (perms: Permission[]) => {
    const allIncluded = perms.every(p => permissions.includes(p));
    setPermissions(prev => allIncluded ? prev.filter(p => !perms.includes(p)) : [...new Set([...prev, ...perms])]);
  };

  return (
    <div className="space-y-4">
      <div><label className="text-xs font-medium text-muted-foreground">Role Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" disabled={role?.isSystem} /></div>
      <div><label className="text-xs font-medium text-muted-foreground">Description</label><Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" /></div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Permissions ({permissions.length} selected)</label>
        <div className="space-y-1 max-h-[40vh] overflow-y-auto border border-border rounded-lg p-2">
          {permissionGroups.map((group) => {
            const allChecked = group.perms.every(p => permissions.includes(p));
            const someChecked = group.perms.some(p => permissions.includes(p));
            const isExpanded = expandedModule === group.module;
            return (
              <div key={group.module}>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedModule(isExpanded ? null : group.module)}>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  <button onClick={(e) => { e.stopPropagation(); toggleModule(group.perms); }}
                    className={`w-4 h-4 rounded border flex items-center justify-center ${allChecked ? "bg-primary border-primary" : someChecked ? "bg-primary/30 border-primary" : "border-border"}`}>
                    {allChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                  </button>
                  <span className="text-xs font-semibold text-foreground">{group.module}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{group.perms.filter(p => permissions.includes(p)).length}/{group.perms.length}</span>
                </div>
                {isExpanded && (
                  <div className="ml-8 space-y-0.5 animate-fade-in">
                    {group.perms.map(perm => (
                      <label key={perm} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/30 cursor-pointer">
                        <button onClick={() => togglePerm(perm)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${permissions.includes(perm) ? "bg-primary border-primary" : "border-border"}`}>
                          {permissions.includes(perm) && <Check className="w-3 h-3 text-primary-foreground" />}
                        </button>
                        <span className="text-xs text-muted-foreground font-mono">{perm}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button disabled={!name} onClick={() => onSave({ name, description, permissions, isSystem: role?.isSystem || false, color: role?.color || "bg-info/10 text-info" })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {role ? "Update Role" : "Create Role"}
        </button>
      </div>
    </div>
  );
}
