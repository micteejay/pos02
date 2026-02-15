import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ChevronRight,
  User,
  DollarSign,
  ArrowRightLeft,
  FileText,
  ShoppingCart,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Eye,
  MessageSquare,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

type Tab = "pending" | "history";
type ApprovalStatus = "pending" | "approved" | "rejected" | "escalated";
type Priority = "high" | "medium" | "low";

interface ApprovalStep {
  role: string;
  approver: string | null;
  status: "pending" | "approved" | "rejected" | "skipped";
  date: string | null;
  comment: string | null;
}

interface ApprovalRequest {
  id: string;
  title: string;
  type: string;
  typeIcon: React.ElementType;
  requester: string;
  department: string;
  amount: number | null;
  submitted: string;
  priority: Priority;
  status: ApprovalStatus;
  currentStep: number;
  steps: ApprovalStep[];
  description: string;
}

const approvalRequests: ApprovalRequest[] = [
  {
    id: "APR-2041",
    title: "Q1 Marketing Budget Increase",
    type: "Expense",
    typeIcon: DollarSign,
    requester: "Lisa Park",
    department: "Marketing",
    amount: 24500,
    submitted: "Feb 14, 2026",
    priority: "high",
    status: "pending",
    currentStep: 1,
    description: "Request to increase Q1 marketing budget for new campaign launch.",
    steps: [
      { role: "Department Head", approver: "James Wilson", status: "approved", date: "Feb 14, 2026", comment: "Aligned with growth targets." },
      { role: "Finance Manager", approver: null, status: "pending", date: null, comment: null },
      { role: "CFO", approver: null, status: "pending", date: null, comment: null },
    ],
  },
  {
    id: "APR-2040",
    title: "Warehouse Equipment Purchase",
    type: "Purchase Order",
    typeIcon: ShoppingCart,
    requester: "David Kim",
    department: "Operations",
    amount: 18750,
    submitted: "Feb 13, 2026",
    priority: "medium",
    status: "pending",
    currentStep: 0,
    description: "New conveyor belts and sorting equipment for South Hub warehouse.",
    steps: [
      { role: "Warehouse Manager", approver: null, status: "pending", date: null, comment: null },
      { role: "Operations Director", approver: null, status: "pending", date: null, comment: null },
    ],
  },
  {
    id: "APR-2039",
    title: "Bulk Widget Transfer — West to Main",
    type: "Stock Transfer",
    typeIcon: ArrowRightLeft,
    requester: "Sarah Chen",
    department: "Inventory",
    amount: null,
    submitted: "Feb 13, 2026",
    priority: "low",
    status: "pending",
    currentStep: 0,
    description: "Transfer 500 Widget Alpha units from West DC to Main HQ to fulfill backorders.",
    steps: [
      { role: "Inventory Manager", approver: null, status: "pending", date: null, comment: null },
      { role: "Regional Manager", approver: null, status: "pending", date: null, comment: null },
    ],
  },
  {
    id: "APR-2038",
    title: "Annual Compliance Report",
    type: "Document",
    typeIcon: FileText,
    requester: "Maria Garcia",
    department: "Legal",
    amount: null,
    submitted: "Feb 12, 2026",
    priority: "high",
    status: "escalated",
    currentStep: 1,
    description: "Annual compliance report requiring executive sign-off before filing deadline.",
    steps: [
      { role: "Legal Counsel", approver: "Tom Reed", status: "approved", date: "Feb 12, 2026", comment: "Reviewed and compliant." },
      { role: "VP Operations", approver: null, status: "pending", date: null, comment: null },
      { role: "CEO", approver: null, status: "pending", date: null, comment: null },
    ],
  },
  {
    id: "APR-2035",
    title: "New POS Terminal Deployment",
    type: "Purchase Order",
    typeIcon: ShoppingCart,
    requester: "Frank Kim",
    department: "Sales",
    amount: 8900,
    submitted: "Feb 10, 2026",
    priority: "medium",
    status: "approved",
    currentStep: 2,
    description: "Deploy 4 new POS terminals across Main HQ and West Store.",
    steps: [
      { role: "Store Manager", approver: "Alice Chen", status: "approved", date: "Feb 10, 2026", comment: "Needed for holiday rush." },
      { role: "IT Director", approver: "Bob Tran", status: "approved", date: "Feb 11, 2026", comment: "Compatible with current infrastructure." },
    ],
  },
  {
    id: "APR-2032",
    title: "Employee Reimbursement — Travel",
    type: "Expense",
    typeIcon: DollarSign,
    requester: "Grace Wu",
    department: "Sales",
    amount: 1250,
    submitted: "Feb 9, 2026",
    priority: "low",
    status: "rejected",
    currentStep: 1,
    description: "Travel reimbursement for client visit to Chicago office.",
    steps: [
      { role: "Department Head", approver: "Frank Kim", status: "approved", date: "Feb 9, 2026", comment: null },
      { role: "Finance Manager", approver: "Diana Lee", status: "rejected", date: "Feb 10, 2026", comment: "Missing receipts for hotel stay. Please resubmit." },
    ],
  },
  {
    id: "APR-2030",
    title: "Discount Override — Bulk Order",
    type: "Discount",
    typeIcon: DollarSign,
    requester: "Bob Tran",
    department: "Sales",
    amount: 3200,
    submitted: "Feb 8, 2026",
    priority: "medium",
    status: "approved",
    currentStep: 1,
    description: "15% discount for bulk order from VIP client — exceeds standard threshold.",
    steps: [
      { role: "Sales Manager", approver: "Alice Chen", status: "approved", date: "Feb 8, 2026", comment: "VIP client — approved per policy." },
    ],
  },
];

const stats = [
  { label: "Pending", value: "4", change: "+2", trend: "down" as const, icon: Clock, color: "text-warning" },
  { label: "Approved (MTD)", value: "23", change: "+5", trend: "up" as const, icon: CheckCircle2, color: "text-success" },
  { label: "Rejected (MTD)", value: "3", change: "-1", trend: "up" as const, icon: XCircle, color: "text-destructive" },
  { label: "Avg. Resolution", value: "1.4d", change: "-0.3d", trend: "up" as const, icon: ClipboardCheck, color: "text-primary" },
];

const priorityConfig = {
  high: { label: "High", className: "bg-destructive/10 text-destructive" },
  medium: { label: "Medium", className: "bg-warning/10 text-warning" },
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
};

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: "Approved", className: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive", icon: XCircle },
  escalated: { label: "Escalated", className: "bg-info/10 text-info", icon: AlertTriangle },
};

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "pending", label: "Pending Queue", icon: Clock, count: approvalRequests.filter((r) => r.status === "pending" || r.status === "escalated").length },
    { key: "history", label: "History", icon: ClipboardCheck },
  ];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review pending requests and track approval workflows.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${s.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{s.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && (
                <span className="w-5 h-5 rounded-full bg-warning/20 text-warning text-[10px] font-bold flex items-center justify-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "pending" && (
          <PendingTab expandedId={expandedId} setExpandedId={setExpandedId} />
        )}
        {tab === "history" && (
          <HistoryTab expandedId={expandedId} setExpandedId={setExpandedId} />
        )}
      </div>
    </AppLayout>
  );
}

function PendingTab({ expandedId, setExpandedId }: { expandedId: string | null; setExpandedId: (id: string | null) => void }) {
  const pending = approvalRequests.filter((r) => r.status === "pending" || r.status === "escalated");

  return (
    <div className="space-y-3 animate-fade-in">
      {pending.map((req) => (
        <ApprovalCard key={req.id} req={req} expanded={expandedId === req.id} onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)} />
      ))}
    </div>
  );
}

function HistoryTab({ expandedId, setExpandedId }: { expandedId: string | null; setExpandedId: (id: string | null) => void }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const history = approvalRequests.filter((r) => r.status === "approved" || r.status === "rejected");
  const filtered = history.filter((r) => {
    const matchSearch = search === "" || r.title.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || r.requester.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search history..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground outline-none">
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">No matching records.</div>
        ) : (
          filtered.map((req) => (
            <ApprovalCard key={req.id} req={req} expanded={expandedId === req.id} onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function ApprovalCard({ req, expanded, onToggle }: { req: ApprovalRequest; expanded: boolean; onToggle: () => void }) {
  const sc = statusConfig[req.status];
  const pc = priorityConfig[req.priority];
  const StatusIcon = sc.icon;

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all duration-300">
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-start gap-4 p-5 text-left hover:bg-muted/20 transition-colors">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${sc.className}`}>
          <req.typeIcon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-primary">{req.id}</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pc.className}`}>{pc.label}</span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{req.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.requester}</span>
            <span>{req.department}</span>
            <span>{req.submitted}</span>
            {req.amount && <span className="font-semibold text-foreground">${req.amount.toLocaleString()}</span>}
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1.5 shrink-0 mr-2">
          {req.steps.map((step, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                step.status === "approved" ? "bg-success" : step.status === "rejected" ? "bg-destructive" : step.status === "pending" && i === req.currentStep ? "bg-warning animate-pulse" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded: workflow steps */}
      {expanded && (
        <div className="px-5 pb-5 animate-fade-in">
          <p className="text-xs text-muted-foreground mb-4">{req.description}</p>

          {/* Step timeline */}
          <div className="relative pl-6 space-y-4 border-l-2 border-border ml-2">
            {req.steps.map((step, i) => {
              const isActive = i === req.currentStep && (req.status === "pending" || req.status === "escalated");
              const stepSc = step.status === "approved" ? statusConfig.approved : step.status === "rejected" ? statusConfig.rejected : statusConfig.pending;
              const StepIcon = stepSc.icon;

              return (
                <div key={i} className="relative">
                  {/* Dot on line */}
                  <div className={`absolute -left-[calc(1.5rem+5px)] w-3 h-3 rounded-full border-2 border-card ${
                    step.status === "approved" ? "bg-success" : step.status === "rejected" ? "bg-destructive" : isActive ? "bg-warning" : "bg-muted-foreground/30"
                  }`} />

                  <div className={`p-3 rounded-lg ${isActive ? "bg-warning/5 border border-warning/20" : "bg-muted/30"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{step.role}</span>
                        <StepIcon className={`w-3.5 h-3.5 ${stepSc.className.split(" ")[1]}`} />
                      </div>
                      {step.date && <span className="text-[10px] text-muted-foreground">{step.date}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {step.approver ? step.approver : isActive ? "Awaiting approval…" : "—"}
                    </p>
                    {step.comment && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
                        <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="italic">"{step.comment}"</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons for pending */}
          {(req.status === "pending" || req.status === "escalated") && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <button className="flex items-center gap-1.5 px-4 py-2 bg-success text-success-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors ml-auto">
                <MessageSquare className="w-3.5 h-3.5" /> Comment
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
