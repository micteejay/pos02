import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2, Banknote, CreditCard, Smartphone, ArrowLeftRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

export type PaymentMethod = "cash" | "transfer" | "card" | "mobile";

export interface PaymentLine {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

const METHOD_META: Record<PaymentMethod, { label: string; icon: any; hint: string }> = {
  cash: { label: "Cash", icon: Banknote, hint: "" },
  transfer: { label: "Bank Transfer", icon: ArrowLeftRight, hint: "Add reference / sender name" },
  card: { label: "Card", icon: CreditCard, hint: "POS terminal" },
  mobile: { label: "Mobile Pay", icon: Smartphone, hint: "USSD / wallet" },
};

interface Props {
  open: boolean;
  total: number;
  customerName: string;
  customerSelected: boolean; // true when an actual customer (not Walk-in) is linked
  formatCurrency: (n: number) => string;
  currencySymbol: string;
  onCancel: () => void;
  onConfirm: (result: { payments: PaymentLine[]; amountTendered: number; change: number; balanceDue: number }) => void;
}

export default function PaymentDialog({
  open,
  total,
  customerName,
  customerSelected,
  formatCurrency,
  currencySymbol,
  onCancel,
  onConfirm,
}: Props) {
  const { can } = usePermissions();
  const canCredit = can("sales.credit");
  const [lines, setLines] = useState<PaymentLine[]>([{ method: "cash", amount: total, reference: "" }]);

  // Reset when reopened
  useEffect(() => {
    if (open) setLines([{ method: "cash", amount: Number(total.toFixed(2)), reference: "" }]);
  }, [open, total]);

  const tendered = useMemo(() => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0), [lines]);
  const cashPortion = useMemo(
    () => lines.filter((l) => l.method === "cash").reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [lines]
  );
  const change = Math.max(0, tendered - total);
  const balanceDue = Math.max(0, total - tendered);
  // Change only payable in cash. If overpay non-cash, treat as invalid.
  const overpayWithoutCash = tendered > total && cashPortion < change - 0.0001;

  const update = (idx: number, patch: Partial<PaymentLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const add = () =>
    setLines((prev) => [...prev, { method: "transfer", amount: Math.max(0, total - tendered), reference: "" }]);
  const remove = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const fillRemaining = (idx: number) => {
    const others = lines.reduce((s, l, i) => (i === idx ? s : s + (Number(l.amount) || 0)), 0);
    update(idx, { amount: Math.max(0, Number((total - others).toFixed(2))) });
  };

  const confirm = () => {
    const cleaned = lines.filter((l) => Number(l.amount) > 0);
    if (cleaned.length === 0) return toast.error("Enter at least one payment amount");
    for (const l of cleaned) {
      if (l.method === "transfer" && !(l.reference || "").trim()) {
        return toast.error("Add a reference for the transfer payment");
      }
    }
    if (overpayWithoutCash) return toast.error("Change can only be given on cash. Reduce non-cash amounts.");
    if (balanceDue > 0) {
      if (!customerSelected) return toast.error("Select a customer to record outstanding balance");
      if (!canCredit) return toast.error("You don't have permission to leave a balance owed");
    }
    onConfirm({
      payments: cleaned,
      amountTendered: tendered,
      change,
      balanceDue,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="glass-card rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">Take Payment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{customerName || "Walk-in"} · Total {formatCurrency(total)}</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {lines.map((line, idx) => {
            const Meta = METHOD_META[line.method];
            const Icon = Meta.icon;
            return (
              <div key={idx} className="rounded-xl border border-border/50 bg-card/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <select
                    value={line.method}
                    onChange={(e) => update(idx, { method: e.target.value as PaymentMethod })}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {Object.entries(METHOD_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  {lines.length > 1 && (
                    <button onClick={() => remove(idx)} className="p-1.5 rounded hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5">{currencySymbol}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={line.amount || ""}
                    onChange={(e) => update(idx, { amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="h-9 text-sm"
                  />
                  <button
                    onClick={() => fillRemaining(idx)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 whitespace-nowrap"
                    title="Fill remaining"
                  >
                    Fill
                  </button>
                </div>
                {(line.method === "transfer" || line.method === "card" || line.method === "mobile") && (
                  <Input
                    value={line.reference || ""}
                    onChange={(e) => update(idx, { reference: e.target.value })}
                    placeholder={line.method === "transfer" ? "Reference / sender (required)" : "Reference (optional)"}
                    className="h-8 text-xs"
                    maxLength={120}
                  />
                )}
              </div>
            );
          })}

          <button
            onClick={add}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add payment method
          </button>

          <div className="rounded-xl bg-muted/30 border border-border/40 p-3 space-y-1.5 text-xs">
            <Row label="Total" value={formatCurrency(total)} />
            <Row label="Paid" value={formatCurrency(tendered)} accent={tendered >= total ? "success" : undefined} />
            {change > 0 && <Row label="Change (cash)" value={formatCurrency(change)} accent="success" bold />}
            {balanceDue > 0 && <Row label="Balance owed" value={formatCurrency(balanceDue)} accent="warning" bold />}
          </div>

          {overpayWithoutCash && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Change can only be returned on cash payments. Adjust the non-cash amounts.
            </div>
          )}
          {balanceDue > 0 && !customerSelected && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 text-warning text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Select a customer (not Walk-in) to leave an outstanding balance.
            </div>
          )}
          {balanceDue > 0 && customerSelected && !canCredit && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 text-warning text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              You don't have permission to complete sales with a balance owed.
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-border bg-card/80 backdrop-blur-md">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={confirm}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            {balanceDue > 0 ? `Complete with ${formatCurrency(balanceDue)} owed` : "Complete sale"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: "success" | "warning"; bold?: boolean }) {
  const color =
    accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${color} ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}