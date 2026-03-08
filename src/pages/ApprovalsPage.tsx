import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppEvents } from "@/hooks/use-app-events";
import { useAppSettings } from "@/hooks/use-app-settings";
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Search,
  ChevronRight, User, DollarSign, ArrowRightLeft, FileText, ShoppingCart,
  MessageSquare, TrendingUp, TrendingDown, Package, GitBranch,
} from "lucide-react";

type Tab = "pending" | "history";

const typeIcons: Record<string, React.ElementType> = {
  purchase_order: ShoppingCart,
  stock_transfer: ArrowRightLeft,
  expense: DollarSign,
  discount: DollarSign,
  document: FileText,
  workflow: GitBranch,
};

const priorityConfig = {
  high: { label: "High", className: "bg-destructive/10 text-destructive" },
  medium: { label: "Medium", className: "bg-warning/10 text-warning" },
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
};

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: "Approved", className: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive", icon: XCircle },
};

export default function ApprovalsPage() {
  const { approvalItems, approveItem, rejectItem } = useAppEvents();
  const { formatCurrency, hasPermission } = useAppSettings();
  const [tab, setTab] = useState<Tab>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [commentText, setCommentText] = useState("");

  const pending = useMemo(() => approvalItems.filter(r => r.status === "pending"), [approvalItems]);
  const history = useMemo(() => approvalItems.filter(r => r.status !== "pending"), [approvalItems]);

  const stats = useMemo(() => [
    { label: "Pending", value: pending.length.toString(), icon: Clock, color: "text-warning" },
    { label: "Approved (Total)", value: approvalItems.filter(a => a.status === "approved").length.toString(), icon: CheckCircle2, color: "text-success" },
    { label: "Rejected (Total)", value: approvalItems.filter(a => a.status === "rejected").length.toString(), icon: XCircle, color: "text-destructive" },
    { label: "Types", value: [...new Set(approvalItems.map(a => a.type))].length.toString(), icon: ClipboardCheck, color: "text-primary" },
  ], [approvalItems, pending]);

  const tabs = [
    { key: "pending" as const, label: "Pending Queue", icon: Clock, count: pending.length },
    { key: "history" as const, label: "History", icon: ClipboardCheck },
  ];

  const filteredHistory = useMemo(() =>
    history.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())),
  [history, search]);

  const handleApprove = (id: string) => {
    approveItem(id, commentText || undefined);
    setCommentText("");
  };

  const handleReject = (id: string) => {
    rejectItem(id, commentText || "Rejected");
    setCommentText("");
  };

  const renderCard = (req: typeof approvalItems[0]) => {
    const sc = statusConfig[req.status];
    const pc = priorityConfig[req.priority];
    const TypeIcon = typeIcons[req.type] || FileText;
    const expanded = expandedId === req.id;

    return (
      <div key={req.id} className="glass-card rounded-xl overflow-hidden transition-all duration-300">
        <button onClick={() => setExpandedId(expanded ? null : req.id)} className="w-full flex items-start gap-4 p-5 text-left hover:bg-muted/20 transition-colors">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${sc.className}`}>
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-primary">{req.id}</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pc.className}`}>{pc.label}</span>
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{req.type.replace(/_/g, " ")}</span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{req.title}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.requester}</span>
              <span>{req.department}</span>
              <span>{req.submitted}</span>
              {req.amount && <span className="font-semibold text-foreground">{formatCurrency(req.amount)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mr-2">
            {req.steps.map((step, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${step.status === "approved" ? "bg-success" : step.status === "rejected" ? "bg-destructive" : i === req.currentStep && req.status === "pending" ? "bg-warning animate-pulse" : "bg-muted-foreground/30"}`} />
            ))}
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        </button>

        {expanded && (
          <div className="px-5 pb-5 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-4">{req.description}</p>
            {req.sourceId && (
              <p className="text-xs text-muted-foreground mb-3">Source: <span className="text-primary font-mono">{req.sourceId}</span></p>
            )}

            <div className="relative pl-6 space-y-4 border-l-2 border-border ml-2">
              {req.steps.map((step, i) => {
                const isActive = i === req.currentStep && req.status === "pending";
                const stepColor = step.status === "approved" ? "bg-success" : step.status === "rejected" ? "bg-destructive" : isActive ? "bg-warning" : "bg-muted-foreground/30";
                return (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[calc(1.5rem+5px)] w-3 h-3 rounded-full border-2 border-card ${stepColor}`} />
                    <div className={`p-3 rounded-lg ${isActive ? "bg-warning/5 border border-warning/20" : "bg-muted/30"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{step.role}</span>
                        {step.date && <span className="text-[10px] text-muted-foreground">{step.date}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{step.approver || (isActive ? "Awaiting approval…" : "—")}</p>
                      {step.comment && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                          <span className="italic">"{step.comment}"</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {req.status === "pending" && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment (optional)..."
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApprove(req.id)} className="flex items-center gap-1.5 px-4 py-2 bg-success text-success-foreground rounded-lg text-xs font-medium hover:opacity-90">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => handleReject(req.id)} className="flex items-center gap-1.5 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-medium hover:opacity-90">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">Review pending requests and track approval workflows.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" />{t.label}
              {t.count !== undefined && <span className="w-5 h-5 rounded-full bg-warning/20 text-warning text-[10px] font-bold flex items-center justify-center">{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === "pending" && (
          <div className="space-y-3 animate-fade-in">
            {pending.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>All caught up! No pending approvals.</p>
              </div>
            ) : pending.map(renderCard)}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm max-w-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input placeholder="Search history..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">No matching records.</div>
              ) : filteredHistory.map(renderCard)}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
