import { useState } from "react";
import { X, Banknote, CreditCard, Smartphone, ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "transfer", label: "Bank Transfer", icon: ArrowLeftRight },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "mobile", label: "Mobile Pay", icon: Smartphone },
] as const;

interface Props {
  customerId: string;
  customerName: string;
  outstanding: number;
  currencySymbol: string;
  formatCurrency: (n: number) => string;
  onClose: () => void;
  onRecorded: () => void;
}

export default function CustomerPaymentDialog({
  customerId,
  customerName,
  outstanding,
  currencySymbol,
  formatCurrency,
  onClose,
  onRecorded,
}: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>(outstanding > 0 ? outstanding.toFixed(2) : "");
  const [method, setMethod] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount");
    if (method === "transfer" && !reference.trim()) return toast.error("Add a reference for the transfer");
    setSaving(true);
    const { error } = await supabase.from("customer_payments").insert({
      customer_id: customerId,
      amount: value,
      method,
      reference: reference.trim() || null,
      note: note.trim() || null,
      company_id: user?.companyId || null,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Recorded ${formatCurrency(value)} payment`);
    window.dispatchEvent(new CustomEvent("customer-stats-updated", { detail: { id: customerId } }));
    onRecorded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">Record Payment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {customerName}
              {outstanding > 0 && <> · Outstanding {formatCurrency(outstanding)}</>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground w-5">{currencySymbol}</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Method</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                    method === m.id ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase">{m.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
          {method !== "cash" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Reference {method === "transfer" ? "(required)" : "(optional)"}
              </label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ref / sender" maxLength={120} className="mt-1" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional internal note" maxLength={200} className="mt-1" />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Recording…" : "Record payment"}
          </button>
        </div>
      </div>
    </div>
  );
}