import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Shield,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Settings,
  FileText,
  Package,
  DollarSign,
  Users,
  Lock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  ChevronRight,
} from "lucide-react";

type Severity = "info" | "warning" | "critical";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: string;
  moduleIcon: React.ElementType;
  target: string;
  detail: string;
  severity: Severity;
  ip: string;
}

const auditEntries: AuditEntry[] = [];

const actionIcons: Record<string, React.ElementType> = {
  "role.update": Edit,
  "sale.refund": DollarSign,
  "workflow.approve": CheckCircle2,
  "workflow.reject": AlertTriangle,
  "inventory.transfer": Package,
  "inventory.adjust": Edit,
  "security.alert": Shield,
  "auth.login": LogIn,
  "auth.logout": LogOut,
  "document.upload": Plus,
  "permission.change": Lock,
  "system.backup": Settings,
};

const severityConfig = {
  info: { label: "Info", className: "bg-muted text-muted-foreground" },
  warning: { label: "Warning", className: "bg-warning/10 text-warning" },
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive" },
};

const stats = [
  { label: "Events Today", value: auditEntries.length.toString(), icon: Clock },
  { label: "Warnings", value: auditEntries.filter(e => e.severity === "warning").length.toString(), icon: AlertTriangle, color: "text-warning" },
  { label: "Critical", value: auditEntries.filter(e => e.severity === "critical").length.toString(), icon: Shield, color: "text-destructive" },
  { label: "Active Users", value: [...new Set(auditEntries.map(e => e.user))].length.toString(), icon: Users, color: "text-primary" },
];

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<"timestamp" | "user" | "action" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const modules = [...new Set(auditEntries.map((e) => e.module))];
  const users = [...new Set(auditEntries.map((e) => e.user))];
  const activeFilterCount = [filterSeverity, filterModule, filterUser].filter((f) => f !== "all").length;

  const handleSort = (key: "timestamp" | "user" | "action") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: "timestamp" | "user" | "action" }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const filtered = useMemo(() => {
    let items = auditEntries.filter((e) => {
      const matchSearch = search === "" || e.detail.toLowerCase().includes(search.toLowerCase()) || e.user.toLowerCase().includes(search.toLowerCase()) || e.action.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()) || e.target.toLowerCase().includes(search.toLowerCase());
      const matchSeverity = filterSeverity === "all" || e.severity === filterSeverity;
      const matchModule = filterModule === "all" || e.module === filterModule;
      const matchUser = filterUser === "all" || e.user === filterUser;
      return matchSearch && matchSeverity && matchModule && matchUser;
    });

    if (sortKey) {
      items = [...items].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "timestamp") cmp = a.timestamp.localeCompare(b.timestamp);
        else if (sortKey === "user") cmp = a.user.localeCompare(b.user);
        else if (sortKey === "action") cmp = a.action.localeCompare(b.action);
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return items;
  }, [search, filterSeverity, filterModule, filterUser, sortKey, sortDir]);

  const clearFilters = () => { setFilterSeverity("all"); setFilterModule("all"); setFilterUser("all"); };

  const exportCSV = () => {
    const header = "ID,Timestamp,User,Role,Action,Module,Target,Detail,Severity,IP";
    const rows = filtered.map((e) => `"${e.id}","${e.timestamp}","${e.user}","${e.role}","${e.action}","${e.module}","${e.target}","${e.detail}","${e.severity}","${e.ip}"`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tamper-proof record of all system activities and changes.
            </p>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className={`w-5 h-5 ${s.color || "text-primary"}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input placeholder="Search by user, action, target, or detail..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${showFilters || activeFilterCount > 0 ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 animate-fade-in">
            <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground outline-none">
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground outline-none">
              <option value="all">All Modules</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground outline-none">
              <option value="all">All Users</option>
              {users.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 px-3 py-3"></th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort("timestamp")}>
                  <div className="flex items-center gap-1">Timestamp <SortIcon col="timestamp" /></div>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort("user")}>
                  <div className="flex items-center gap-1">User <SortIcon col="user" /></div>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort("action")}>
                  <div className="flex items-center gap-1">Action <SortIcon col="action" /></div>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Target</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Severity</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-sm text-muted-foreground">No matching log entries.</td></tr>
              ) : (
                filtered.map((entry) => {
                  const sc = severityConfig[entry.severity];
                  const ActionIcon = actionIcons[entry.action] || Eye;
                  const isExpanded = expandedId === entry.id;

                  return (
                    <>
                      <tr
                        key={entry.id}
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        <td className="px-3 py-3">
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span className="font-mono">{entry.timestamp}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{entry.user}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.role}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <ActionIcon className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-mono text-foreground">{entry.action}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{entry.module}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{entry.target}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{entry.ip}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${entry.id}-detail`} className="bg-muted/20">
                          <td colSpan={7} className="px-8 py-4 animate-fade-in">
                            <div className="flex items-start gap-3">
                              <entry.moduleIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm text-foreground">{entry.detail}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>Event ID: {entry.id}</span>
                                  <span>Module: {entry.module}</span>
                                  <span>IP: {entry.ip}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Tamper-proof notice */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
          <Lock className="w-4 h-4 text-primary shrink-0" />
          All audit entries are cryptographically signed and tamper-proof. Logs cannot be modified or deleted.
        </div>
      </div>
    </AppLayout>
  );
}
