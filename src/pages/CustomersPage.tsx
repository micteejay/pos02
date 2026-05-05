import { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useCustomers, type Customer } from "@/hooks/use-customers";
import { useAppSettings } from "@/hooks/use-app-settings";
import { Search, Plus, X, Edit2, Trash2, Mail, Phone, MapPin, User, Loader2, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function CustomersPage() {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer, recomputeStats } = useCustomers();
  const [recomputing, setRecomputing] = useState(false);
  const { formatCurrency } = useAppSettings();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
    );
  }, [customers, search]);

  const totalSpend = useMemo(
    () => customers.reduce((s, c) => s + c.totalSpend, 0),
    [customers]
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage customer records, contact details, and lifetime value.
            </p>
          </div>
          <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setRecomputing(true);
              await recomputeStats();
              setRecomputing(false);
              toast.success("Customer totals recomputed from sales");
            }}
            disabled={recomputing}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50"
            title="Recompute spend & order counts from sales history"
          >
            <RefreshCw className={`w-4 h-4 ${recomputing ? "animate-spin" : ""}`} />
            Recompute
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Customer
          </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat icon={Users} label="Total Customers" value={customers.length.toString()} />
          <Stat icon={User} label="Lifetime Spend" value={formatCurrency(totalSpend)} />
          <Stat
            icon={User}
            label="Avg. Spend / Customer"
            value={formatCurrency(customers.length ? totalSpend / customers.length : 0)}
          />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No customers match your search." : "No customers yet — add your first one."}
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Contact</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Orders</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Spend</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        {c.address && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.address}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</p>}
                        {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">{c.totalOrders}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">{formatCurrency(c.totalSpend)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted" title="Edit">
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return;
                              await deleteCustomer(c.id);
                              toast.success("Customer deleted");
                            }}
                            className="p-1.5 rounded hover:bg-destructive/10"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={async (form) => {
            if (editing) {
              const res = await updateCustomer(editing.id, form);
              if (res.ok) { toast.success("Customer updated"); setShowForm(false); setEditing(null); }
              else toast.error(res.error || "Failed to update customer");
            } else {
              const res = await addCustomer(form);
              if (res.ok) { toast.success("Customer added"); setShowForm(false); }
              else toast.error(res.error || "Failed to add customer");
            }
          }}
        />
      )}
    </AppLayout>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function CustomerForm({
  editing,
  onClose,
  onSave,
}: {
  editing: Customer | null;
  onClose: () => void;
  onSave: (form: { name: string; email?: string; phone?: string; address?: string; city?: string; notes?: string }) => void;
}) {
  const [name, setName] = useState(editing?.name || "");
  const [email, setEmail] = useState(editing?.email || "");
  const [phone, setPhone] = useState(editing?.phone || "");
  const [address, setAddress] = useState(editing?.address || "");
  const [city, setCity] = useState(editing?.city || "");
  const [notes, setNotes] = useState(editing?.notes || "");

  const submit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Please enter a valid email"); return;
    }
    onSave({ name, email, phone, address, city, notes });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">{editing ? "Edit Customer" : "New Customer"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Full Name *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" maxLength={255} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 123 4567" maxLength={40} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building" maxLength={300} />
          </Field>
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (preferences, account info...)"
              maxLength={1000}
              className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none"
            />
          </Field>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={submit} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            {editing ? "Save changes" : "Add customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}