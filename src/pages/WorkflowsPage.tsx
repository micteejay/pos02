import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import {
  GitBranch, Clock, CheckCircle2, XCircle, Plus, Search, Filter, ChevronRight,
  X, Trash2, ArrowRight, Edit2, AlertTriangle,
} from "lucide-react";

type WFStatus = "pending" | "approved" | "rejected";

interface WorkflowStep {
  name: string;
  status: "pending" | "completed" | "rejected";
  assignee: string;
}

interface Workflow {
  id: string;
  title: string;
  type: string;
  status: WFStatus;
  currentStep: number;
  steps: WorkflowStep[];
  requester: string;
  created: string;
  amount: string;
}

const initialWorkflows: Workflow[] = [
  { id: "WF-4521", title: "Purchase Order - Office Supplies", type: "Purchase Order Approval", status: "pending", currentStep: 1, steps: [{ name: "Manager Review", status: "completed", assignee: "Sarah Chen" }, { name: "Finance Review", status: "pending", assignee: "Lisa Zhang" }, { name: "Director Approval", status: "pending", assignee: "James Wilson" }], requester: "Sarah Chen", created: "Feb 12, 2026", amount: "$12,450" },
  { id: "WF-4518", title: "Q1 Marketing Budget", type: "Expense Approval", status: "pending", currentStep: 2, steps: [{ name: "Dept Head Review", status: "completed", assignee: "Mike Ross" }, { name: "VP Approval", status: "completed", assignee: "David Kumar" }, { name: "Finance Review", status: "pending", assignee: "Lisa Zhang" }, { name: "CFO Sign-off", status: "pending", assignee: "Lisa Zhang" }], requester: "Mike Ross", created: "Feb 11, 2026", amount: "$2,340" },
  { id: "WF-4515", title: "Warehouse B Stock Transfer", type: "Stock Transfer Approval", status: "approved", currentStep: 2, steps: [{ name: "Inventory Check", status: "completed", assignee: "Lisa Park" }, { name: "Logistics Approval", status: "completed", assignee: "Robert Chen" }], requester: "Lisa Park", created: "Feb 10, 2026", amount: "500 units" },
  { id: "WF-4512", title: "Employee Discount Override", type: "Discount Override Approval", status: "rejected", currentStep: 2, steps: [{ name: "Sales Manager", status: "completed", assignee: "Alice Chen" }, { name: "Finance Check", status: "completed", assignee: "Diana Lee" }, { name: "Director", status: "rejected", assignee: "James Wilson" }], requester: "James Wilson", created: "Feb 9, 2026", amount: "35% off" },
];

const statusConfig = {
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Pending" },
  approved: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Approved" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewWF, setShowNewWF] = useState(false);

  const filtered = workflows.filter((wf) => {
    const matchSearch = !search || wf.title.toLowerCase().includes(search.toLowerCase()) || wf.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || wf.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const advanceStep = useCallback((id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id !== id || wf.status !== "pending") return wf;
        const newSteps = [...wf.steps];
        newSteps[wf.currentStep] = { ...newSteps[wf.currentStep], status: "completed" };
        const nextStep = wf.currentStep + 1;
        const isComplete = nextStep >= newSteps.length;
        return { ...wf, steps: newSteps, currentStep: nextStep, status: isComplete ? "approved" : "pending" };
      })
    );
  }, []);

  const rejectWorkflow = useCallback((id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id !== id) return wf;
        const newSteps = [...wf.steps];
        newSteps[wf.currentStep] = { ...newSteps[wf.currentStep], status: "rejected" };
        return { ...wf, steps: newSteps, status: "rejected" };
      })
    );
  }, []);

  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
  }, []);

  const addWorkflow = (data: { title: string; type: string; amount: string }) => {
    const newWf: Workflow = {
      id: `WF-${4530 + workflows.length}`,
      ...data,
      status: "pending",
      currentStep: 0,
      steps: [
        { name: "Manager Review", status: "pending", assignee: "Auto-assigned" },
        { name: "Director Approval", status: "pending", assignee: "Auto-assigned" },
      ],
      requester: "You",
      created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    setWorkflows((prev) => [newWf, ...prev]);
    setShowNewWF(false);
  };

  const counts = { pending: workflows.filter((w) => w.status === "pending").length, approved: workflows.filter((w) => w.status === "approved").length, rejected: workflows.filter((w) => w.status === "rejected").length };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage approval workflows and processes</p>
          </div>
          <button onClick={() => setShowNewWF(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />New Workflow
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {([["Pending", counts.pending, "warning"], ["Approved", counts.approved, "success"], ["Rejected", counts.rejected, "destructive"]] as const).map(([label, count, color]) => (
            <div key={label} className="glass-card rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold text-${color}`}>{count}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workflows..." className="pl-9" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No workflows match your search.</div>
          ) : filtered.map((wf) => {
            const config = statusConfig[wf.status];
            const isExpanded = expandedId === wf.id;
            return (
              <div key={wf.id} className="glass-card rounded-xl overflow-hidden transition-all duration-300">
                <button onClick={() => setExpandedId(isExpanded ? null : wf.id)} className="w-full flex items-start gap-4 p-5 text-left hover:bg-muted/20 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><GitBranch className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-primary">{wf.id}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                        <config.icon className="w-3 h-3" />{config.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mt-1">{wf.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{wf.type} · {wf.requester} · {wf.amount}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{wf.created}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {wf.steps.map((step, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${step.status === "completed" ? "bg-primary" : step.status === "rejected" ? "bg-destructive" : i === wf.currentStep && wf.status === "pending" ? "bg-warning animate-pulse" : "bg-muted"}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Step {Math.min(wf.currentStep + 1, wf.steps.length)}/{wf.steps.length}{wf.status === "pending" ? `: ${wf.steps[wf.currentStep]?.name}` : ""}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 animate-fade-in">
                    <div className="relative pl-6 space-y-3 border-l-2 border-border ml-2 mb-4">
                      {wf.steps.map((step, i) => {
                        const isActive = i === wf.currentStep && wf.status === "pending";
                        return (
                          <div key={i} className="relative">
                            <div className={`absolute -left-[calc(1.5rem+5px)] w-3 h-3 rounded-full border-2 border-card ${step.status === "completed" ? "bg-success" : step.status === "rejected" ? "bg-destructive" : isActive ? "bg-warning" : "bg-muted-foreground/30"}`} />
                            <div className={`p-3 rounded-lg ${isActive ? "bg-warning/5 border border-warning/20" : "bg-muted/30"}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">{step.name}</span>
                                <span className={`text-[10px] font-medium ${step.status === "completed" ? "text-success" : step.status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}>
                                  {step.status === "completed" ? "✓ Done" : step.status === "rejected" ? "✗ Rejected" : isActive ? "Awaiting..." : "Pending"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">Assignee: {step.assignee}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      {wf.status === "pending" && (
                        <>
                          <button onClick={() => advanceStep(wf.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20"><CheckCircle2 className="w-3.5 h-3.5" />Approve Step</button>
                          <button onClick={() => rejectWorkflow(wf.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20"><XCircle className="w-3.5 h-3.5" />Reject</button>
                        </>
                      )}
                      <button onClick={() => deleteWorkflow(wf.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted ml-auto"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showNewWF && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewWF(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">New Workflow</h3>
              <button onClick={() => setShowNewWF(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <NewWFForm onAdd={addWorkflow} onCancel={() => setShowNewWF(false)} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function NewWFForm({ onAdd, onCancel }: { onAdd: (data: { title: string; type: string; amount: string }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(""); const [type, setType] = useState("Purchase Order Approval"); const [amount, setAmount] = useState("");
  return (
    <div className="space-y-3">
      <div><label className="text-xs font-medium text-muted-foreground">Title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Workflow title" className="mt-1" /></div>
      <div><label className="text-xs font-medium text-muted-foreground">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          <option>Purchase Order Approval</option><option>Expense Approval</option><option>Stock Transfer Approval</option><option>Discount Override Approval</option>
        </select>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Amount/Value</label><Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$0.00 or description" className="mt-1" /></div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
        <button disabled={!title || !amount} onClick={() => onAdd({ title, type, amount })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">Create</button>
      </div>
    </div>
  );
}
