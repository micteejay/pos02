import AppLayout from "@/components/AppLayout";
import { GitBranch, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight, Plus } from "lucide-react";

const workflows = [
  {
    id: "WF-4521",
    title: "Purchase Order - Office Supplies",
    type: "Purchase Order Approval",
    status: "pending",
    currentStep: "Manager Review",
    totalSteps: 3,
    completedSteps: 1,
    requester: "Sarah Chen",
    created: "Feb 12, 2026",
    amount: "$12,450",
  },
  {
    id: "WF-4518",
    title: "Q1 Marketing Budget",
    type: "Expense Approval",
    status: "pending",
    currentStep: "Finance Review",
    totalSteps: 4,
    completedSteps: 2,
    requester: "Mike Ross",
    created: "Feb 11, 2026",
    amount: "$2,340",
  },
  {
    id: "WF-4515",
    title: "Warehouse B Stock Transfer",
    type: "Stock Transfer Approval",
    status: "approved",
    currentStep: "Completed",
    totalSteps: 2,
    completedSteps: 2,
    requester: "Lisa Park",
    created: "Feb 10, 2026",
    amount: "500 units",
  },
  {
    id: "WF-4512",
    title: "Employee Discount Override",
    type: "Discount Override Approval",
    status: "rejected",
    currentStep: "Rejected by Finance",
    totalSteps: 3,
    completedSteps: 2,
    requester: "James Wilson",
    created: "Feb 9, 2026",
    amount: "35% off",
  },
];

const statusConfig = {
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Pending" },
  approved: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Approved" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
};

export default function WorkflowsPage() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage approval workflows and processes</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending", count: 2, color: "warning" },
            { label: "Approved", count: 14, color: "success" },
            { label: "Rejected", count: 3, color: "destructive" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold text-${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Workflow List */}
        <div className="space-y-3">
          {workflows.map((wf) => {
            const config = statusConfig[wf.status as keyof typeof statusConfig];
            return (
              <div key={wf.id} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300 cursor-pointer group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <GitBranch className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-primary">{wf.id}</span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                          <config.icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mt-1">{wf.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{wf.type} · {wf.requester} · {wf.amount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{wf.created}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: wf.totalSteps }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${
                            i < wf.completedSteps
                              ? wf.status === "rejected" && i === wf.completedSteps - 1
                                ? "bg-destructive"
                                : "bg-primary"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Step {wf.completedSteps}/{wf.totalSteps}: {wf.currentStep}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
