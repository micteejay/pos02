import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData } from "@/hooks/use-shared-data";
import {
  Building2, Warehouse, Users, Network, Search, MapPin, Phone, Mail,
  ChevronRight, ChevronDown, Plus, Globe, Boxes, X, Edit2, Trash2,
} from "lucide-react";

interface OrgNode { name: string; role: string; children?: OrgNode[]; }

function OrgTreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className={depth > 0 ? "ml-6 border-l border-border/50 pl-4" : ""}>
      <div className="flex items-center gap-3 py-2 group cursor-pointer" onClick={() => hasChildren && setExpanded(!expanded)}>
        {hasChildren ? (expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />) : <div className="w-4" />}
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">{node.name.split(" ").map((n) => n[0]).join("")}</div>
        <div><p className="text-sm font-medium text-foreground">{node.name}</p><p className="text-xs text-muted-foreground">{node.role}</p></div>
      </div>
      {hasChildren && expanded && <div className="animate-fade-in">{node.children!.map((child, i) => <OrgTreeNode key={i} node={child} depth={depth + 1} />)}</div>}
    </div>
  );
}

type Tab = "stores" | "warehouses" | "departments" | "hierarchy";

export default function OrganizationPage() {
  const { settings } = useAppSettings();
  const {
    stores, addStore, updateStore, deleteStore,
    warehouses, addWarehouse, deleteWarehouse,
    departments, addDepartment, updateDepartment, deleteDepartment,
  } = useSharedData();
  const [activeTab, setActiveTab] = useState<Tab>("stores");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStore, setEditingStore] = useState<typeof stores[0] | null>(null);
  const [editingDept, setEditingDept] = useState<typeof departments[0] | null>(null);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "stores", label: "Stores", icon: Building2 },
    { key: "warehouses", label: "Warehouses", icon: Warehouse },
    { key: "departments", label: "Departments", icon: Users },
    { key: "hierarchy", label: "Org Chart", icon: Network },
  ];

  const stats = [
    { label: "Total Stores", value: stores.length.toString(), icon: Building2, color: "text-primary" },
    { label: "Warehouses", value: warehouses.length.toString(), icon: Warehouse, color: "text-info" },
    { label: "Departments", value: departments.length.toString(), icon: Boxes, color: "text-accent" },
    { label: "Total Headcount", value: departments.reduce((s, d) => s + d.headcount, 0).toString(), icon: Users, color: "text-success" },
  ];

  const filteredStores = stores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredWarehouses = warehouses.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDepts = departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  // Build org tree from departments
  const orgTree: OrgNode = {
    name: settings.appName, role: "Organization",
    children: departments.map(d => ({
      name: d.head || d.name, role: `Head of ${d.name}`,
      children: d.teams.map(t => ({ name: t, role: `Team — ${d.name}` })),
    })),
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Organization</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage stores, warehouses, departments, and structure</p>
          </div>
          {activeTab !== "hierarchy" && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" />Add {activeTab === "stores" ? "Store" : activeTab === "warehouses" ? "Warehouse" : "Department"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {activeTab !== "hierarchy" && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={`Search ${activeTab}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        )}

        {/* Stores */}
        {activeTab === "stores" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredStores.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-10">No stores yet. Click "Add Store" to create one.</p>}
            {filteredStores.map((store) => (
              <div key={store.id} className="glass-card rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{store.name}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${store.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{store.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingStore(store)} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => deleteStore(store.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  {store.address && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{store.address}</div>}
                  {store.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{store.phone}</div>}
                  {store.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{store.email}</div>}
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                  <div><span className="text-muted-foreground">Employees: </span><span className="font-medium text-foreground">{store.employees}</span></div>
                  <div><span className="text-muted-foreground">Revenue: </span><span className="font-medium text-primary">{store.revenue}</span></div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{store.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warehouses */}
        {activeTab === "warehouses" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {filteredWarehouses.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-10">No warehouses yet. Click "Add Warehouse" to create one.</p>}
            {filteredWarehouses.map((wh) => (
              <div key={wh.id} className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Warehouse className="w-5 h-5 text-info" /></div>
                    <div><h3 className="text-sm font-semibold text-foreground">{wh.name}</h3><p className="text-xs text-muted-foreground">{wh.location}</p></div>
                  </div>
                  <button onClick={() => deleteWarehouse(wh.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className={`font-medium ${wh.capacity > 85 ? "text-destructive" : "text-foreground"}`}>{wh.capacity}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${wh.capacity > 85 ? "bg-destructive" : wh.capacity > 70 ? "bg-warning" : "bg-primary"}`} style={{ width: `${wh.capacity}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50"><p className="text-sm font-bold text-foreground">{wh.sqft}</p><p className="text-[10px] text-muted-foreground">Sq. Ft.</p></div>
                    <div className="p-2 rounded-lg bg-muted/50"><p className="text-sm font-bold text-foreground">{wh.zones}</p><p className="text-[10px] text-muted-foreground">Zones</p></div>
                    <div className="p-2 rounded-lg bg-muted/50"><p className="text-sm font-bold text-foreground">{wh.activePicks}</p><p className="text-[10px] text-muted-foreground">Picks</p></div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Manager: <span className="text-foreground font-medium">{wh.manager}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Departments */}
        {activeTab === "departments" && (
          <div className="space-y-3">
            {filteredDepts.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No departments yet. Click "Add Department" to create one.</p>}
            {filteredDepts.map((dept) => (
              <div key={dept.id} className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Boxes className="w-5 h-5 text-accent" /></div>
                    <div><h3 className="text-sm font-semibold text-foreground">{dept.name}</h3><p className="text-xs text-muted-foreground">Head: {dept.head}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right"><p className="font-semibold text-foreground">{dept.headcount}</p><p className="text-muted-foreground">People</p></div>
                      <div className="text-right"><p className="font-semibold text-primary">{dept.budget}</p><p className="text-muted-foreground">Budget</p></div>
                    </div>
                    <button onClick={() => setEditingDept(dept)} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => deleteDepartment(dept.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {dept.teams.map((team) => <span key={team} className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">{team}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Org Chart */}
        {activeTab === "hierarchy" && (
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4"><Globe className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Organization Hierarchy</h3></div>
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Add departments to see the org chart.</p>
            ) : (
              <OrgTreeNode node={orgTree} />
            )}
          </div>
        )}
      </div>

      {/* Add Store Modal */}
      {showAddModal && activeTab === "stores" && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Add Store</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <StoreForm onSave={(data) => { addStore(data); setShowAddModal(false); }} onCancel={() => setShowAddModal(false)} />
          </div>
        </div>
      )}

      {/* Edit Store Modal */}
      {editingStore && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingStore(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Edit Store</h3>
              <button onClick={() => setEditingStore(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <StoreForm store={editingStore} onSave={(data) => { updateStore(editingStore.id, data); setEditingStore(null); }} onCancel={() => setEditingStore(null)} />
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && activeTab === "departments" && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Add Department</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <DeptForm onSave={(data) => { addDepartment(data); setShowAddModal(false); }} onCancel={() => setShowAddModal(false)} />
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingDept(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Edit Department</h3>
              <button onClick={() => setEditingDept(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <DeptForm dept={editingDept} onSave={(data) => { updateDepartment(editingDept.id, data); setEditingDept(null); }} onCancel={() => setEditingDept(null)} />
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddModal && activeTab === "warehouses" && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Add Warehouse</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <WHForm onSave={(data) => { addWarehouse(data); setShowAddModal(false); }} onCancel={() => setShowAddModal(false)} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function StoreForm({ store, onSave, onCancel }: { store?: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(store?.name || ""); const [type, setType] = useState(store?.type || "Retail");
  const [address, setAddress] = useState(store?.address || ""); const [phone, setPhone] = useState(store?.phone || "");
  const [email, setEmail] = useState(store?.email || ""); const [employees, setEmployees] = useState(store?.employees?.toString() || "");
  const [status, setStatus] = useState(store?.status || "Active");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option>Retail</option><option>Kiosk</option><option>Outlet</option><option>Warehouse</option></select>
        </div>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Address</label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Phone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Email</label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Employees</label><Input type="number" value={employees} onChange={(e) => setEmployees(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option>Active</option><option>Maintenance</option><option>Closed</option></select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button disabled={!name} onClick={() => onSave({ name, type, address, phone, email, employees: parseInt(employees) || 0, status, revenue: store?.revenue || "$0/mo" })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{store ? "Update" : "Add"} Store</button>
      </div>
    </div>
  );
}

function DeptForm({ dept, onSave, onCancel }: { dept?: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(dept?.name || ""); const [head, setHead] = useState(dept?.head || "");
  const [headcount, setHeadcount] = useState(dept?.headcount?.toString() || ""); const [budget, setBudget] = useState(dept?.budget || "");
  const [teams, setTeams] = useState(dept?.teams?.join(", ") || "");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Department Head</label><Input value={head} onChange={(e) => setHead(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Headcount</label><Input type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Budget</label><Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="$1.5M" className="mt-1" /></div>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Teams (comma-separated)</label><Input value={teams} onChange={(e) => setTeams(e.target.value)} className="mt-1" /></div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button disabled={!name} onClick={() => onSave({ name, head, headcount: parseInt(headcount) || 0, budget, teams: teams.split(",").map(t => t.trim()).filter(Boolean) })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{dept ? "Update" : "Add"} Department</button>
      </div>
    </div>
  );
}

function WHForm({ onSave, onCancel }: { onSave: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [location, setLocation] = useState(""); const [sqft, setSqft] = useState(""); const [manager, setManager] = useState(""); const [zones, setZones] = useState("6");
  return (
    <div className="space-y-3">
      <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
      <div><label className="text-xs font-medium text-muted-foreground">Location</label><Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Sq. Ft.</label><Input value={sqft} onChange={(e) => setSqft(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Zones</label><Input type="number" value={zones} onChange={(e) => setZones(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Manager</label><Input value={manager} onChange={(e) => setManager(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button disabled={!name} onClick={() => onSave({ name, location, sqft, manager, zones: parseInt(zones) || 6, capacity: 0, activePicks: 0 })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Add Warehouse</button>
      </div>
    </div>
  );
}
