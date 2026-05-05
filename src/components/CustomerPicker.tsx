import { useEffect, useMemo, useRef, useState } from "react";
import { User, X, Plus } from "lucide-react";
import { useCustomers, type Customer } from "@/hooks/use-customers";

interface Props {
  value: { id?: string | null; name: string; email?: string; phone?: string };
  onChange: (next: { id: string | null; name: string; email: string; phone: string }) => void;
  placeholder?: string;
  compact?: boolean;
}

/**
 * Shared customer field used by POS and Invoice. Lets users:
 *  - free-type a name (e.g. Walk-in)
 *  - pick from the customers directory (auto-fills email/phone)
 *  - auto-create a new customer record on save (handled by parent via findOrCreate)
 */
export default function CustomerPicker({ value, onChange, placeholder = "Walk-in Customer", compact }: Props) {
  const { customers, addCustomer } = useCustomers();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const matches = useMemo(() => {
    const q = (value.name || "").toLowerCase().trim();
    if (!q) return customers.slice(0, 8);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
    ).slice(0, 8);
  }, [customers, value.name]);

  const select = (c: Customer) => {
    onChange({ id: c.id, name: c.name, email: c.email || "", phone: c.phone || "" });
    setOpen(false);
  };

  const clear = () => onChange({ id: null, name: "", email: "", phone: "" });

  const createNew = async () => {
    if (!value.name.trim()) return;
    const res = await addCustomer({ name: value.name, email: value.email || undefined, phone: value.phone || undefined });
    if (res.ok) {
      onChange({ id: res.customer.id, name: res.customer.name, email: res.customer.email || "", phone: res.customer.phone || "" });
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-muted-foreground" />
        <input
          value={value.name}
          onChange={(e) => onChange({ id: null, name: e.target.value, email: value.email || "", phone: value.phone || "" })}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-b border-border/50 pb-1"
        />
        {(value.id || value.name) && (
          <button onClick={clear} className="p-1 rounded hover:bg-muted" title="Clear">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input
            value={value.email || ""}
            onChange={(e) => onChange({ id: value.id || null, name: value.name, email: e.target.value, phone: value.phone || "" })}
            placeholder="Email (optional)"
            className="text-xs bg-background border border-border rounded px-2 py-1.5 outline-none focus:border-primary"
          />
          <input
            value={value.phone || ""}
            onChange={(e) => onChange({ id: value.id || null, name: value.name, email: value.email || "", phone: e.target.value })}
            placeholder="Phone (optional)"
            className="text-xs bg-background border border-border rounded px-2 py-1.5 outline-none focus:border-primary"
          />
        </div>
      )}

      {open && (matches.length > 0 || value.name.trim()) && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
          {matches.map((c) => (
            <button
              key={c.id}
              onClick={() => select(c)}
              className="w-full text-left px-3 py-2 hover:bg-muted text-xs flex flex-col"
            >
              <span className="font-medium text-foreground">{c.name}</span>
              <span className="text-muted-foreground">
                {c.email || ""}{c.email && c.phone ? " · " : ""}{c.phone || ""}
              </span>
            </button>
          ))}
          {value.name.trim() && !customers.some((c) => c.name.toLowerCase() === value.name.toLowerCase()) && (
            <button
              onClick={createNew}
              className="w-full text-left px-3 py-2 border-t border-border hover:bg-muted text-xs text-primary flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3" /> Create customer "{value.name}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}