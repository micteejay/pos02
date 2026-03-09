import { useState, useCallback, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useAppEvents } from "@/hooks/use-app-events";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GitBranch, Clock, CheckCircle2, XCircle, Plus, Search, Filter, ChevronRight,
  X, Trash2, ArrowRight, Edit2, AlertTriangle, Loader2, Lock,
} from "lucide-react";

type WFStatus = "active" | "completed" | "paused" | "cancelled";

interface WorkflowStep {
  name: string;
  role: string;
  status: "pending" | "completed" | "rejected";
  assignee: string;
}

interface Workflow {
  id: string;
  dbId: string;
  title: string;
  type: string;
  status: WFStatus;
  currentStep: number;
  steps: WorkflowStep[];
  requester: string;
  created: string;
  amount: string;
}

const statusConfig = {
  active: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Active" },
  completed: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Completed" },
  paused: { icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-muted", label: "Paused" },
  cancelled: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Cancelled" },
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  sales_rep: "Sales Rep",
  warehouse_staff: "Warehouse Staff",
  viewer: "Viewer",
};

const roleNameToKey: Record<string, string> = {
  "Super Admin": "super_admin",
  "Admin": "admin",
  "Manager": "manager",
  "Sales Rep": "sales_rep",
  "Warehouse Staff": "warehouse_staff",
  "Viewer": "viewer",
};

export default function WorkflowsPage() {
  const { addNotification, addApprovalItem, getStagesForType } = useAppEvents();
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewWF, setShowNewWF] = useState(false);

  // Check if current user can approve a workflow step
  const canApproveStep = (wf: Workflow) => {
    if (!user || wf.status !== "active") return false;
    const userRoleKey = roleNameToKey[user.role] || user.role.toLowerCase().replace(/ /g, "_");
    // Admin/super_admin can always approve
    if (userRoleKey === "super_admin" || userRoleKey === "admin") return true;
    // Check if user's role matches current step's required role
    const currentStepData = wf.steps[wf.currentStep];
    if (!currentStepData) return false;
    return currentStepData.role === userRoleKey;
  };

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && !error) {
        const profilesRes = await supabase.from("profiles").select("id, name");
        const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.name || "Unknown"]));

        setWorkflows(data.map((wf: any) => {
          const steps: WorkflowStep[] = Array.isArray(wf.steps) ? (wf.steps as any[]).map(s => ({
            name: s.name || "Step",
            role: s.role || "manager",
            status: s.status || "pending",
            assignee: s.assignee || "Auto-assigned",
          })) : [
            { name: "Manager Review", role: "manager", status: "pending", assignee: "Auto-assigned" },
            { name: "Admin Approval", role: "admin", status: "pending", assignee: "Auto-assigned" },
          ];

          return {
            id: `WF-${wf.id.substring(0, 6).toUpperCase()}`,
            dbId: wf.id,
            title: wf.title,
            type: wf.type || "General",
            status: wf.status as WFStatus,
            currentStep: wf.current_step || 0,
            steps,
            requester: wf.created_by ? (profileMap.get(wf.created_by) || "Unknown") : "System",
            created: new Date(wf.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            amount: wf.description || "",
          };
        }));
      }
      setLoading(false);
    };
    fetchWorkflows();
  }, []);

  const filtered = workflows.filter((wf) => {
    const matchSearch = !search || wf.title.toLowerCase().includes(search.toLowerCase()) || wf.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || wf.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const advanceStep = useCallback(async (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (!wf || wf.status !== "active") return;

    const newSteps = [...wf.steps];
    newSteps[wf.currentStep] = { ...newSteps[wf.currentStep], status: "completed" };
    const nextStep = wf.currentStep + 1;
    const isComplete = nextStep >= newSteps.length;

    await supabase.from("workflows").update({
      steps: newSteps as any,
      current_step: nextStep,
      status: isComplete ? "completed" : "active",
      completed_at: isComplete ? new Date().toISOString() : null,
    }).eq("id", wf.dbId);

    // Log step history
    await supabase.from("workflow_step_history").insert({
      workflow_id: wf.dbId,
      step_index: wf.currentStep,
      step_name: wf.steps[wf.currentStep]?.name || "Step",
      action: "approved",
      acted_by: user?.id || null,
    });

    setWorkflows(prev => prev.map(w => {
      if (w.id !== id) return w;
      return { ...w, steps: newSteps, currentStep: nextStep, status: isComplete ? "completed" as WFStatus : "active" as WFStatus };
    }));

    if (isComplete) {
      addNotification({ type: "workflow", title: `Workflow ${id} fully approved`, message: `${wf.title} completed all steps`, link: "/workflows" });
      toast.success("Workflow completed");
    } else {
      toast.success("Step approved");
    }
  }, [workflows, user, addNotification]);

  const rejectWorkflow = useCallback(async (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;

    const newSteps = [...wf.steps];
    newSteps[wf.currentStep] = { ...newSteps[wf.currentStep], status: "rejected" };

    await supabase.from("workflows").update({
      steps: newSteps as any,
      status: "cancelled",
    }).eq("id", wf.dbId);

    await supabase.from("workflow_step_history").insert({
      workflow_id: wf.dbId,
      step_index: wf.currentStep,
      step_name: wf.steps[wf.currentStep]?.name || "Step",
      action: "rejected",
      acted_by: user?.id || null,
    });

    setWorkflows(prev => prev.map(w => {
      if (w.id !== id) return w;
      return { ...w, steps: newSteps, status: "cancelled" as WFStatus };
    }));

    addNotification({ type: "workflow", title: `Workflow ${id} rejected`, message: `${wf.title} was rejected at step: ${wf.steps[wf.currentStep].name}`, link: "/workflows" });
    toast.success("Workflow rejected");
  }, [workflows, user, addNotification]);

  const deleteWorkflow = useCallback(async (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;
    await supabase.from("workflow_step_history").delete().eq("workflow_id", wf.dbId);
    await supabase.from("workflows").delete().eq("id", wf.dbId);
    setWorkflows(prev => prev.filter(w => w.id !== id));
    toast.success("Workflow deleted");
  }, [workflows]);

  const addWorkflow = async (data: { title: string; type: string; amount: string }) => {
    // Map the type to workflow config key
    const typeKeyMap: Record<string, string> = {
      "Purchase Order Approval": "purchase_order",
      "Expense Approval": "expense",
      "Stock Transfer Approval": "stock_transfer",
      "Discount Override Approval": "general",
    };
    const typeKey = typeKeyMap[data.type] || "general";
    
    // Get configured stages
    const configuredStages = getStagesForType(typeKey);
    
    const steps: WorkflowStep[] = configuredStages.map(stage => ({
      name: stage.name,
      role: stage.role,
      status: "pending" as const,
      assignee: "Auto-assigned",
    }));

    const { data: newWf, error } = await supabase.from("workflows").insert({
      title: data.title,
      type: data.type,
      description: data.amount,
      status: "active",
      current_step: 0,
      steps: steps as any,
      created_by: user?.id || null,
    }).select().single();

    if (newWf && !error) {
      setWorkflows(prev => [{
        id: `WF-${newWf.id.substring(0, 6).toUpperCase()}`,
        dbId: newWf.id,
        title: data.title,
        type: data.type,
        status: "active",
        currentStep: 0,
        steps,
        requester: user?.name || "You",
        created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        amount: data.amount,
      }, ...prev]);

      setShowNewWF(false);
      addApprovalItem({ title: data.title, type: typeKey as any, sourceId: newWf.id, requester: user?.name || "You", department: "Operations", amount: null, description: `${data.type}: ${data.amount}`, priority: "medium" });
      addNotification({ type: "workflow", title: `Workflow created`, message: `${data.title} submitted for approval`, link: "/approvals" });
      toast.success("Workflow created");
    }
  };

  const counts = { active: workflows.filter((w) => w.status === "active").length, completed: workflows.filter((w) => w.status === "completed").length, cancelled: workflows.filter((w) => w.status === "cancelled").length };

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
          {([["Active", counts.active, "warning"], ["Completed", counts.completed, "success"], ["Cancelled", counts.cancelled, "destructive"]] as const).map(([label, count, color]) => (
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
            <option value="all">All Status</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="paused">Paused</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">No workflows match your search.</div>
            ) : filtered.map((wf) => {
              const config = statusConfig[wf.status] || statusConfig.active;
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
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${step.status === "completed" ? "bg-primary" : step.status === "rejected" ? "bg-destructive" : i === wf.currentStep && wf.status === "active" ? "bg-warning animate-pulse" : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Step {Math.min(wf.currentStep + 1, wf.steps.length)}/{wf.steps.length}{wf.status === "active" && wf.currentStep < wf.steps.length ? `: ${wf.steps[wf.currentStep]?.name}` : ""}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 animate-fade-in">
                      <div className="relative pl-6 space-y-3 border-l-2 border-border ml-2 mb-4">
                        {wf.steps.map((step, i) => {
                          const isActive = i === wf.currentStep && wf.status === "active";
                          const userCanApprove = isActive && canApproveStep(wf);
                          return (
                            <div key={i} className="relative">
                              <div className={`absolute -left-[calc(1.5rem+5px)] w-3 h-3 rounded-full border-2 border-card ${step.status === "completed" ? "bg-success" : step.status === "rejected" ? "bg-destructive" : isActive ? "bg-warning" : "bg-muted-foreground/30"}`} />
                              <div className={`p-3 rounded-lg ${isActive ? "bg-warning/5 border border-warning/20" : "bg-muted/30"}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                                    {step.name}
                                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      {roleLabels[step.role] || step.role}
                                    </span>
                                    {isActive && !userCanApprove && (
                                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-destructive/10 text-destructive flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" /> Not your role
                                      </span>
                                    )}
                                  </span>
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
                        {wf.status === "active" && wf.currentStep < wf.steps.length && (
                          canApproveStep(wf) ? (
                            <>
                              <button onClick={() => advanceStep(wf.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20"><CheckCircle2 className="w-3.5 h-3.5" />Approve Step</button>
                              <button onClick={() => rejectWorkflow(wf.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20"><XCircle className="w-3.5 h-3.5" />Reject</button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-muted-foreground text-xs">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Requires <strong className="text-foreground">{roleLabels[wf.steps[wf.currentStep]?.role] || wf.steps[wf.currentStep]?.role}</strong> role</span>
                            </div>
                          )
                        )}
                        <button onClick={() => deleteWorkflow(wf.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted ml-auto"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
