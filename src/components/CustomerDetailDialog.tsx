import { useEffect, useState } from "react";
import { X, Award, Wallet, Receipt as ReceiptIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers } from "@/hooks/use-customers";

type Tab = "overview" | "payments" | "sales";

interface Props {
  customerId: string;
  formatCurrency: (n: number) => string;
  onClose: () => void;
}

interface PaymentRow { id: string; amount: number; method: string; reference: string | null; note: string | null; created_at: string }
interface LoyaltyRow { id: string; points: number; type: string; reference_type: string | null; note: string | null; created_at: string }
interface SaleRow { id: string; transaction_number: string; total: number; balance_due: number; created_at: string }

/**
 * Cross-tab read-only insight into a customer's account, shown next to the
 * POS CustomerPicker. Surfaces loyalty points, outstanding balance, recent
 * payments and sales history without leaving the till.
 */
export default function CustomerDetailDialog({ customerId, formatCurrency, onClose }: Props) {
  const { getById } = useCustomers();
  const customer = getById(customerId);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [pRes, lRes, sRes] = await Promise.all([
        supabase.from("customer_payments").select("id,amount,method,reference,note,created_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(25),
        supabase.from("loyalty_transactions").select("id,points,type,reference_type,note,created_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(25),
        supabase.from("sales_transactions").select("id,transaction_number,total,balance_due,created_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(15),
      ]);
      if (!active) return;
      setPayments((pRes.data || []) as any);
      setLoyalty((lRes.data || []) as any);
      setSales((sRes.data || []) as any);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerId]);

  if (!customer) return null;

  const fmtDate = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">{customer.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {customer.phone || customer.email || "No contact"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 border-b border-border">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Loyalty</p>
            <p className="text-lg font-bold text-primary mt-1">{customer.loyalty_points ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">points</p>
          </div>
          <div className={`rounded-lg p-3 text-center border ${ (customer.outstanding_balance ?? 0) > 0 ? "bg-warning/5 border-warning/30" : "bg-muted/30 border-border/40"}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Owed</p>
            <p className={`text-lg font-bold mt-1 ${(customer.outstanding_balance ?? 0) > 0 ? "text-warning" : "text-foreground"}`}>{formatCurrency(customer.outstanding_balance ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lifetime</p>
            <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(customer.totalSpend)}</p>
            <p className="text-[10px] text-muted-foreground">{customer.totalOrders} order{customer.totalOrders === 1 ? "" : "s"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/20">
          {[
            { key: "overview" as Tab, label: "Loyalty", icon: Award },
            { key: "payments" as Tab, label: "Payments", icon: Wallet },
            { key: "sales" as Tab, label: "Sales", icon: ReceiptIcon },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : tab === "overview" ? (
            loyalty.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No loyalty activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {loyalty.map(l => (
                  <li key={l.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs">
                    <div>
                      <p className="font-medium text-foreground capitalize">{l.type}{l.reference_type ? ` · ${l.reference_type}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDate(l.created_at)}</p>
                      {l.note && <p className="text-[10px] text-muted-foreground italic">{l.note}</p>}
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${l.points >= 0 ? "text-success" : "text-destructive"}`}>{l.points > 0 ? "+" : ""}{l.points}</span>
                  </li>
                ))}
              </ul>
            )
          ) : tab === "payments" ? (
            payments.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {payments.map(p => (
                  <li key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs">
                    <div>
                      <p className="font-medium text-foreground capitalize">{p.method}{p.reference ? ` · ${p.reference}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDate(p.created_at)}</p>
                      {p.note && <p className="text-[10px] text-muted-foreground italic">{p.note}</p>}
                    </div>
                    <span className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(Number(p.amount))}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            sales.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No sales yet for this customer.</p>
            ) : (
              <ul className="space-y-2">
                {sales.map(s => (
                  <li key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{s.transaction_number}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDate(s.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(Number(s.total))}</p>
                      {Number(s.balance_due) > 0 && (
                        <p className="text-[10px] text-warning">Owed {formatCurrency(Number(s.balance_due))}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>
    </div>
  );
}