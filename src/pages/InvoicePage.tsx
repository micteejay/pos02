import { useState, useRef, useMemo, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import InvoiceTemplate, { InvoiceData, InvoiceItem } from "@/components/InvoiceTemplate";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Printer, Eye, X, Search, Package, ShoppingCart, Check, Loader2, Edit2, CreditCard, Receipt } from "lucide-react";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData } from "@/hooks/use-shared-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printNode } from "@/lib/print";
import { useCustomers } from "@/hooks/use-customers";
import CustomerPicker from "@/components/CustomerPicker";
import { DocumentPreviewSkeleton, PreviewErrorState } from "@/components/PreviewSkeleton";
import EmptyState from "@/components/EmptyState";
import { FileText } from "lucide-react";
import AttachmentsManager, { Attachment } from "@/components/AttachmentsManager";

interface SavedInvoice extends InvoiceData {
  id: string;
  dbId: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  paymentMethod?: string;
  customerId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  attachments?: Attachment[];
}

export default function InvoicePage() {
  const { formatCurrency, settings } = useAppSettings();
  const { inventory, sales, addSale, adjustInventoryQty } = useSharedData();
  const { user } = useAuth();
  const { findOrCreate, getById } = useCustomers();
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<InvoiceData>({
    type: "quote",
    number: `QT-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    customerName: "",
    customerAddress: "",
    items: [{ description: "", qty: 1, rate: 0 }],
    serviceChargePercent: 0,
    notes: "",
  });

  // Customer picker state (kept alongside the form for back-compat)
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [showPreview, setShowPreview] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingDbId, setEditingDbId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<SavedInvoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<SavedInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile" | "transfer">("cash");
  const previewRef = useRef<HTMLDivElement>(null);
  // Attachments on the in-progress (draft) form, keyed by editing id or "new"
  const [formAttachments, setFormAttachments] = useState<Attachment[]>([]);

  // Fetch invoices from DB (online) or local cache (offline)
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      const isOnline = typeof window !== "undefined" && window.navigator.onLine;
      const useOnline = !isTauriEnv || isOnline;

      const mapInvoice = (inv: any, items: any[]): SavedInvoice => ({
        id: inv.number,
        dbId: inv.id,
        type: inv.type as "quote" | "invoice",
        number: inv.number,
        date: inv.date ? new Date(inv.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
        customerName: inv.customer_name,
        customerAddress: inv.customer_address || "",
        customerId: inv.customer_id || null,
        items: items.map((item: any) => ({
          description: item.description,
          qty: Number(item.qty),
          rate: Number(item.rate),
          unitName: item.unit_name || undefined,
          unitFactor: Number(item.unit_factor) || 1,
        })),
        serviceChargePercent: Number(inv.service_charge_percent) || 0,
        notes: inv.notes || "",
        status: inv.status as SavedInvoice["status"],
        attachments: (() => { try { return Array.isArray(inv.attachments) ? inv.attachments : JSON.parse(inv.attachments || "[]"); } catch { return []; } })(),
      });

      if (!useOnline) {
        try {
          const { getDb } = await import("@/lib/db");
          const db = await getDb();
          const localInvs = await db.select("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100");
          const mapped: SavedInvoice[] = [];
          for (const inv of localInvs) {
            const items = await db.select("SELECT * FROM invoice_items WHERE invoice_id = ?", [inv.id]);
            mapped.push(mapInvoice(inv, items));
          }
          setSavedInvoices(mapped);
        } catch (e) {
          console.error("[InvoicePage] Offline invoice fetch failed:", e);
        }
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data && !error) {
        // Cache to local DB
        if (isTauriEnv) {
          try {
            const { getDb } = await import("@/lib/db");
            const db = await getDb();
            for (const inv of data) {
              const now = inv.created_at || new Date().toISOString();
              await db.execute(
                `INSERT OR REPLACE INTO invoices (id, number, type, customer_name, customer_address, customer_id, date, notes, service_charge_percent, status, company_id, created_by, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [inv.id, inv.number, inv.type, inv.customer_name, inv.customer_address, inv.customer_id, inv.date, inv.notes, inv.service_charge_percent || 0, inv.status, inv.company_id, inv.created_by, JSON.stringify(inv.attachments || []), now]
              );
              await db.execute("DELETE FROM invoice_items WHERE invoice_id = ?", [inv.id]);
              for (const item of (inv.invoice_items || [])) {
                await db.execute(
                  `INSERT OR REPLACE INTO invoice_items (id, invoice_id, description, qty, rate, inventory_item_id, unit_name, unit_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [item.id || crypto.randomUUID(), inv.id, item.description, item.qty, item.rate, item.inventory_item_id, item.unit_name, item.unit_factor || 1]
                );
              }
            }
          } catch (e) {
            console.error("[InvoicePage] SQLite invoice cache write failed:", e);
          }
        }
        setSavedInvoices(data.map((inv: any) => mapInvoice(inv, inv.invoice_items || [])));
      }
      setLoading(false);
    };
    fetchInvoices();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return inventory;
    const q = productSearch.toLowerCase();
    return inventory.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [inventory, productSearch]);

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setForm(prev => ({ ...prev, items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item) }));
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { description: "", qty: 1, rate: 0 }] }));
  };

  const removeItem = (index: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const selectProduct = (index: number, product: typeof inventory[0]) => {
    updateItem(index, {
      description: product.name,
      rate: product.price,
      qty: 1,
      unitName: product.baseUnit || "pcs",
      unitFactor: 1,
    });
    setShowProductPicker(null);
    setProductSearch("");
  };

  /** Switch a line to a different selling unit of the same product. */
  const selectUnit = (index: number, unitName: string) => {
    const line = form.items[index];
    const product = inventory.find(p => p.name.toLowerCase() === line.description.toLowerCase());
    if (!product) return;
    if (unitName === (product.baseUnit || "pcs")) {
      updateItem(index, { unitName, unitFactor: 1, rate: product.price });
      return;
    }
    const u = (product.units || []).find(x => x.name === unitName);
    if (u) updateItem(index, { unitName, unitFactor: u.factor, rate: u.price });
  };

  const handlePrint = () => {
    printNode(printRef.current, `${form.type === "quote" ? "Quote" : "Invoice"} ${form.number}`, { paperWidth: "A4" });
  };

  const handleSaveAndRecord = async () => {
    if (!form.customerName || form.items.every(i => !i.description)) {
      toast.error("Please add customer name and at least one item.");
      return;
    }

    // Resolve / auto-create customer record
    let resolvedId = customerId;
    if (!resolvedId && form.customerName.trim() && form.customerName.toLowerCase() !== "walk-in") {
      const c = await findOrCreate({ name: form.customerName, email: customerEmail, phone: customerPhone }).catch(() => null);
      if (c) resolvedId = c.id;
    }

    const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    const isOnline = typeof window !== "undefined" && window.navigator.onLine;
    const useOnline = !isTauriEnv || isOnline;

    const isEdit = !!editingDbId;
    const dateStr = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const lineItemsData = form.items.filter(i => i.description).map(i => {
      const invItem = inventory.find(p => p.name.toLowerCase() === i.description.toLowerCase());
      return {
        id: crypto.randomUUID(),
        description: i.description,
        qty: i.qty,
        rate: i.rate,
        inventory_item_id: invItem?.id || null,
        unit_name: i.unitName || null,
        unit_factor: i.unitFactor || 1,
      };
    });

    if (!useOnline) {
      try {
        const { getDb } = await import("@/lib/db");
        const { enqueueSync } = await import("@/lib/sync-engine");
        const db = await getDb();
        let dbId = editingDbId || crypto.randomUUID();
        const status = isEdit ? (savedInvoices.find(s => s.dbId === dbId)?.status || "draft") : "draft";

        await db.execute(
          `INSERT OR REPLACE INTO invoices (id, number, type, customer_name, customer_address, customer_id, date, notes, service_charge_percent, status, company_id, created_by, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [dbId, form.number, form.type, form.customerName, form.customerAddress || null, resolvedId, dateStr, form.notes || null, form.serviceChargePercent || 0, status, user?.companyId || null, user?.id || null, JSON.stringify(formAttachments), now]
        );
        await db.execute("DELETE FROM invoice_items WHERE invoice_id = ?", [dbId]);
        for (const li of lineItemsData) {
          await db.execute(
            `INSERT OR REPLACE INTO invoice_items (id, invoice_id, description, qty, rate, inventory_item_id, unit_name, unit_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [li.id, dbId, li.description, li.qty, li.rate, li.inventory_item_id, li.unit_name, li.unit_factor]
          );
        }

        const syncPayload = { id: dbId, number: form.number, type: form.type, customer_name: form.customerName, customer_address: form.customerAddress || null, customer_id: resolvedId, date: dateStr, notes: form.notes || null, service_charge_percent: form.serviceChargePercent || 0, status, created_by: user?.id || null, company_id: user?.companyId || null, attachments: formAttachments };
        await enqueueSync("invoices", isEdit ? "UPDATE" : "INSERT", syncPayload);
        for (const li of lineItemsData) {
          await enqueueSync("invoice_items", "INSERT", { ...li, invoice_id: dbId });
        }

        const saved: SavedInvoice = { ...form, id: form.number, dbId, status, customerId: resolvedId, customerEmail, customerPhone, attachments: formAttachments };
        setSavedInvoices(prev => isEdit ? prev.map(s => s.dbId === dbId ? saved : s) : [saved, ...prev]);
        toast.success(`${form.type === "invoice" ? "Invoice" : "Quote"} ${form.number} saved offline.`);
      } catch (e) {
        console.error("[InvoicePage] Offline save failed:", e);
        toast.error("Failed to save invoice offline.");
        return;
      }
    } else {
      const payload = {
        number: form.number,
        type: form.type as any,
        customer_name: form.customerName,
        customer_address: form.customerAddress || null,
        customer_id: resolvedId,
        date: dateStr,
        notes: form.notes || null,
        service_charge_percent: form.serviceChargePercent || 0,
        created_by: user?.id || null,
        company_id: user?.companyId || null,
        attachments: formAttachments as any,
      };

      let dbId = editingDbId;
      if (isEdit) {
        const { error } = await supabase.from("invoices").update(payload).eq("id", editingDbId!);
        if (error) { toast.error("Failed to update invoice: " + error.message); return; }
        await supabase.from("invoice_items").delete().eq("invoice_id", editingDbId!);
      } else {
        const { data: newInv, error } = await supabase.from("invoices").insert({ ...payload, status: "draft" as any }).select().single();
        if (!newInv || error) { toast.error("Failed to save invoice: " + (error?.message || "Unknown")); return; }
        dbId = newInv.id;
      }

      const remoteLineItems = lineItemsData.map(i => ({ ...i, invoice_id: dbId! }));
      if (remoteLineItems.length > 0) await supabase.from("invoice_items").insert(remoteLineItems);

      // Cache to local DB
      if (isTauriEnv) {
        try {
          const { getDb } = await import("@/lib/db");
          const db = await getDb();
          const status = isEdit ? (savedInvoices.find(s => s.dbId === dbId)?.status || "draft") : "draft";
          await db.execute(
            `INSERT OR REPLACE INTO invoices (id, number, type, customer_name, customer_address, customer_id, date, notes, service_charge_percent, status, company_id, created_by, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [dbId, form.number, form.type, form.customerName, form.customerAddress || null, resolvedId, dateStr, form.notes || null, form.serviceChargePercent || 0, status, user?.companyId || null, user?.id || null, JSON.stringify(formAttachments), now]
          );
          await db.execute("DELETE FROM invoice_items WHERE invoice_id = ?", [dbId]);
          for (const li of lineItemsData) {
            await db.execute(
              `INSERT OR REPLACE INTO invoice_items (id, invoice_id, description, qty, rate, inventory_item_id, unit_name, unit_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [li.id, dbId, li.description, li.qty, li.rate, li.inventory_item_id, li.unit_name, li.unit_factor]
            );
          }
        } catch (e) {
          console.error("[InvoicePage] SQLite cache write failed:", e);
        }
      }

      const saved: SavedInvoice = { ...form, id: form.number, dbId: dbId!, status: isEdit ? (savedInvoices.find(s => s.dbId === dbId)?.status || "draft") : "draft", customerId: resolvedId, customerEmail, customerPhone, attachments: formAttachments };
      setSavedInvoices(prev => isEdit ? prev.map(s => s.dbId === dbId ? saved : s) : [saved, ...prev]);
      toast.success(isEdit ? `${form.type === "invoice" ? "Invoice" : "Quote"} ${form.number} updated.` : `${form.type === "invoice" ? "Invoice" : "Quote"} ${form.number} saved as draft.`);
    }

    setEditingDbId(null);
    // Reset form
    setForm({
      type: form.type,
      number: `${form.type === "quote" ? "QT" : "INV"}-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      customerName: "", customerAddress: "",
      items: [{ description: "", qty: 1, rate: 0 }],
      serviceChargePercent: 0, notes: "",
    });
    setCustomerId(null); setCustomerEmail(""); setCustomerPhone("");
    setFormAttachments([]);
  };

  const convertQuoteToInvoice = async (inv: SavedInvoice) => {
    const newNum = `INV-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`;
    const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    const isOnline = typeof window !== "undefined" && window.navigator.onLine;

    if (isTauriEnv && !isOnline) {
      try {
        const { getDb } = await import("@/lib/db");
        const { enqueueSync } = await import("@/lib/sync-engine");
        const db = await getDb();
        await db.execute("UPDATE invoices SET type = ?, number = ?, status = ? WHERE id = ?", ["invoice", newNum, "sent", inv.dbId]);
        await enqueueSync("invoices", "UPDATE", { id: inv.dbId, type: "invoice", number: newNum, status: "sent" });
      } catch (e) {
        console.error("[InvoicePage] Offline convert failed:", e);
      }
    } else {
      await supabase.from("invoices").update({ type: "invoice" as any, number: newNum, status: "sent" as any }).eq("id", inv.dbId);
    }
    setSavedInvoices(prev => prev.map(item => item.dbId === inv.dbId ? { ...item, type: "invoice" as const, number: newNum, id: newNum, status: "sent" as const } : item));
    toast.success("Quote converted to invoice.");
  };

  /** Load a saved invoice into the form for editing. */
  const loadForEdit = (inv: SavedInvoice) => {
    setForm({
      type: inv.type, number: inv.number, date: inv.date,
      customerName: inv.customerName, customerAddress: inv.customerAddress || "",
      items: inv.items.length ? inv.items : [{ description: "", qty: 1, rate: 0 }],
      serviceChargePercent: inv.serviceChargePercent || 0,
      notes: inv.notes || "",
    });
    const linked = inv.customerId ? getById(inv.customerId) : null;
    setCustomerId(inv.customerId || null);
    setCustomerEmail(linked?.email || inv.customerEmail || "");
    setCustomerPhone(linked?.phone || inv.customerPhone || "");
    setEditingDbId(inv.dbId);
    setFormAttachments(inv.attachments || []);
    setShowSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`Editing ${inv.number}`);
  };

  /**
   * Mark invoice paid + convert to a sale receipt:
   *  - records a sale via shared data (so it appears in Sales/Reports)
   *  - deducts stock in BASE units (qty × unitFactor) for each linked product
   *  - flips invoice status to "paid"
   */
  const processPayment = async (inv: SavedInvoice, method: string) => {
    const subtotal = inv.items.reduce((s, i) => s + i.qty * i.rate, 0);
    const serviceCharge = inv.serviceChargePercent ? subtotal * (inv.serviceChargePercent / 100) : 0;
    const total = subtotal + serviceCharge;

    // Record sale (this also persists in DB via shared data hook)
    addSale({
      items: inv.items.filter(i => i.description).map(i => {
        const invItem = inventory.find(p => p.name.toLowerCase() === i.description.toLowerCase());
        return {
          name: i.unitName ? `${i.description} (${i.unitName})` : i.description,
          sku: invItem?.sku || "CUSTOM",
          qty: i.qty,
          price: i.rate,
          unitFactor: i.unitFactor || 1,
          unitName: i.unitName || "",
          baseQty: i.qty * (i.unitFactor || 1),
        };
      }),
      total,
      customer: inv.customerName,
      method,
      store: "Invoice",
      createdBy: user?.name || "System",
      createdByRole: user?.role || "",
      customerId: inv.customerId || null,
      customerEmail: inv.customerEmail || null,
      customerPhone: inv.customerPhone || null,
    });

    // Deduct stock in BASE units
    inv.items.forEach(item => {
      const invItem = inventory.find(p => p.name.toLowerCase() === item.description.toLowerCase());
      if (invItem) adjustInventoryQty(invItem.sku, -(item.qty * (item.unitFactor || 1)));
    });

    const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    const isOnline = typeof window !== "undefined" && window.navigator.onLine;

    if (isTauriEnv && !isOnline) {
      try {
        const { getDb } = await import("@/lib/db");
        const { enqueueSync } = await import("@/lib/sync-engine");
        const db = await getDb();
        await db.execute("UPDATE invoices SET status = ? WHERE id = ?", ["paid", inv.dbId]);
        await enqueueSync("invoices", "UPDATE", { id: inv.dbId, status: "paid" });
      } catch (e) {
        console.error("[InvoicePage] Offline payment status update failed:", e);
      }
    } else {
      await supabase.from("invoices").update({ status: "paid" as any }).eq("id", inv.dbId);
    }
    setSavedInvoices(prev => prev.map(s => s.dbId === inv.dbId ? { ...s, status: "paid", paymentMethod: method } : s));
    setPayingInvoice(null);
    toast.success(`Payment recorded — ${inv.number} is now paid and stock updated.`);
  };

  /** Print a saved invoice as a receipt (uses preview render). */
  const printSaved = (inv: SavedInvoice) => {
    setPreviewInvoice(inv);
    setTimeout(() => printNode(previewRef.current, `${inv.type === "quote" ? "Quote" : "Receipt"} ${inv.number}`, { paperWidth: "A4" }), 200);
  };

  const subtotal = form.items.reduce((s, i) => s + i.qty * i.rate, 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoices & Quotes</h1>
            <p className="text-sm text-muted-foreground mt-1">Create professional documents linked to your inventory and sales</p>
          </div>
          <div className="flex items-center gap-2">
            {savedInvoices.length > 0 && (
              <button onClick={() => setShowSaved(!showSaved)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <ShoppingCart className="w-4 h-4" />Saved ({savedInvoices.length})
              </button>
            )}
            <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Eye className="w-4 h-4" />Preview
            </button>
            <button onClick={handleSaveAndRecord} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Check className="w-4 h-4" />Save & Record
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Printer className="w-4 h-4" />Print
            </button>
          </div>
        </div>

        {/* Saved Invoices Panel */}
        {showSaved && (
          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Saved Documents ({savedInvoices.length})</h3>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : savedInvoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No saved documents"
                description="Save & Record a quote or invoice to see it appear here."
              />
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedInvoices.map((inv, idx) => (
                  <div key={inv.dbId} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">{inv.number}</span>
                      <span className="text-xs text-muted-foreground ml-2">{inv.customerName} · {formatCurrency(inv.items.reduce((s, i) => s + i.qty * i.rate, 0))}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-success/10 text-success" : inv.status === "sent" ? "bg-info/10 text-info" : inv.type === "invoice" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {inv.status} · {inv.type}
                      </span>
                      <button onClick={() => setPreviewInvoice(inv)} className="text-xs px-2 py-1 rounded bg-info/10 text-info hover:bg-info/20 inline-flex items-center gap-1"><Eye className="w-3 h-3" />Preview</button>
                      <button onClick={() => loadForEdit(inv)} className="text-xs px-2 py-1 rounded bg-warning/10 text-warning hover:bg-warning/20 inline-flex items-center gap-1"><Edit2 className="w-3 h-3" />Edit</button>
                      {inv.type === "quote" && inv.status === "draft" && (
                        <button onClick={() => convertQuoteToInvoice(inv)} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20">Convert to Invoice</button>
                      )}
                      {inv.type === "invoice" && inv.status !== "paid" && inv.status !== "cancelled" && (
                        <button onClick={() => { setPayingInvoice(inv); setPaymentMethod("cash"); }} className="text-xs px-2 py-1 rounded bg-success/10 text-success hover:bg-success/20 inline-flex items-center gap-1"><CreditCard className="w-3 h-3" />Pay</button>
                      )}
                      {inv.status === "paid" && (
                        <button onClick={() => printSaved(inv)} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1"><Receipt className="w-3 h-3" />Print Receipt</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Document Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm(prev => ({
                      ...prev, type: e.target.value as "quote" | "invoice",
                      number: `${e.target.value === "quote" ? "QT" : "INV"}-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
                    }))}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="quote">Quote</option>
                    <option value="invoice">Invoice</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Number</label>
                  <Input value={form.number} onChange={(e) => setForm(prev => ({ ...prev, number: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Customer</h3>
              <CustomerPicker
                value={{ id: customerId, name: form.customerName, email: customerEmail, phone: customerPhone }}
                onChange={(v) => {
                  setCustomerId(v.id);
                  setCustomerEmail(v.email);
                  setCustomerPhone(v.phone);
                  setForm((prev) => ({
                    ...prev,
                    customerName: v.name,
                    // Auto-fill address from selected customer when empty
                    customerAddress: prev.customerAddress || (v.id ? (getById(v.id)?.address || "") : ""),
                  }));
                }}
                placeholder="Walk In Customer"
              />
              <div>
                <label className="text-xs font-medium text-muted-foreground">Address (optional)</label>
                <Input value={form.customerAddress} onChange={(e) => setForm(prev => ({ ...prev, customerAddress: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
                <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                  <Plus className="w-3 h-3" />Add Item
                </button>
              </div>

              {inventory.length > 0 && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Package className="w-3 h-3" /> Click the search icon on any item to pick from inventory ({inventory.length} products)
                </p>
              )}

              {form.items.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 relative">
                      <Input value={item.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Item description" />
                      {inventory.length > 0 && (
                        <button onClick={() => { setShowProductPicker(showProductPicker === i ? null : i); setProductSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted" title="Pick from inventory">
                          <Search className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <div className="w-20"><Input type="number" value={item.qty || ""} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} placeholder="Qty" /></div>
                    <div className="w-28"><Input type="number" value={item.rate || ""} onChange={(e) => updateItem(i, { rate: Number(e.target.value) })} placeholder="Rate" /></div>
                    <div className="w-28 flex items-center justify-end"><span className="text-sm font-medium text-foreground">{formatCurrency(item.qty * item.rate)}</span></div>
                    <button onClick={() => removeItem(i)} disabled={form.items.length === 1} className="p-2 rounded hover:bg-destructive/10 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                  {(() => {
                    const product = inventory.find(p => p.name.toLowerCase() === item.description.toLowerCase());
                    if (!product) return null;
                    const opts = [{ name: product.baseUnit || "pcs", factor: 1, price: product.price }, ...(product.units || [])];
                    if (opts.length <= 1) return null;
                    return (
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-[10px] text-muted-foreground">Unit:</span>
                        <select value={item.unitName || (product.baseUnit || "pcs")} onChange={(e) => selectUnit(i, e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground">
                          {opts.map(u => <option key={u.name} value={u.name}>{u.name} (1 = {u.factor} {product.baseUnit || "pcs"})</option>)}
                        </select>
                      </div>
                    );
                  })()}

                  {showProductPicker === i && (
                    <div className="border border-border rounded-lg bg-card shadow-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                      <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search inventory..." className="h-8 text-xs" autoFocus />
                      {filteredProducts.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No products found</p>
                      ) : (
                        filteredProducts.slice(0, 10).map(product => (
                          <button key={product.sku} onClick={() => selectProduct(i, product)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left text-xs">
                            <div><span className="font-medium text-foreground">{product.name}</span><span className="text-muted-foreground ml-2">({product.sku})</span></div>
                            <div className="text-right"><span className="font-medium text-foreground">{formatCurrency(product.price)}</span><span className="text-muted-foreground ml-2">Stock: {product.qty}</span></div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-border space-y-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Service Charge (%)</label>
                  <Input type="number" min={0} max={100} value={form.serviceChargePercent || ""} onChange={(e) => setForm(prev => ({ ...prev, serviceChargePercent: Number(e.target.value) }))} className="mt-1 max-w-[120px]" />
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-2">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="all products are CWORTH brand\nLooking forward for your business."
                className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none"
              />
            </div>

            <AttachmentsManager
              attachments={formAttachments}
              onChange={setFormAttachments}
              scope="invoice"
              parentId={editingDbId || "draft"}
            />
          </div>

          {/* Live Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Live Preview</h3>
              <div className="transform scale-[0.85] origin-top">
                {!form.customerName && form.items.every(i => !i.description) ? (
                  <div className="glass-card rounded-xl">
                    <PreviewErrorState
                      title="Preview will appear here"
                      description="Add a customer name and at least one line item to see the live document."
                    />
                    <div className="hidden">
                      <InvoiceTemplate ref={printRef} data={form} />
                    </div>
                  </div>
                ) : (
                  <InvoiceTemplate ref={printRef} data={form} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowPreview(false)}>
          <div className="max-w-3xl w-full animate-fade-in my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-3">
              <button onClick={() => setShowPreview(false)} className="p-2 rounded-lg bg-card border border-border hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <InvoiceTemplate data={form} />
          </div>
        </div>
      )}

      {/* Saved invoice preview modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setPreviewInvoice(null)}>
          <div className="max-w-3xl w-full animate-fade-in my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end gap-2 mb-3">
              <button onClick={() => printSaved(previewInvoice)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 inline-flex items-center gap-1"><Printer className="w-4 h-4" />Print</button>
              <button onClick={() => setPreviewInvoice(null)} className="p-2 rounded-lg bg-card border border-border hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <InvoiceTemplate ref={previewRef} data={previewInvoice} />
            <div className="mt-4">
              <AttachmentsManager
                attachments={previewInvoice.attachments || []}
                scope="invoice"
                parentId={previewInvoice.dbId}
                onChange={async (next) => {
                  setPreviewInvoice({ ...previewInvoice, attachments: next });
                  setSavedInvoices((prev) =>
                    prev.map((s) => (s.dbId === previewInvoice.dbId ? { ...s, attachments: next } : s))
                  );
                  const isTauriEnv2 = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
                  const isOnline2 = typeof window !== "undefined" && window.navigator.onLine;
                  if (isTauriEnv2 && !isOnline2) {
                    try {
                      const { getDb } = await import("@/lib/db");
                      const { enqueueSync } = await import("@/lib/sync-engine");
                      const db = await getDb();
                      await db.execute("UPDATE invoices SET attachments = ? WHERE id = ?", [JSON.stringify(next), previewInvoice.dbId]);
                      await enqueueSync("invoices", "UPDATE", { id: previewInvoice.dbId, attachments: next });
                    } catch (e) {
                      console.error("[InvoicePage] Offline attachment update failed:", e);
                    }
                  } else {
                    await supabase
                      .from("invoices")
                      .update({ attachments: next as any })
                      .eq("id", previewInvoice.dbId);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payingInvoice && (() => {
        const subtotal = payingInvoice.items.reduce((s, i) => s + i.qty * i.rate, 0);
        const sc = payingInvoice.serviceChargePercent ? subtotal * (payingInvoice.serviceChargePercent / 100) : 0;
        const total = subtotal + sc;
        return (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPayingInvoice(null)}>
            <div className="glass-card rounded-2xl p-6 max-w-sm w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Record Payment</h3>
                <button onClick={() => setPayingInvoice(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{payingInvoice.number} · {payingInvoice.customerName}</p>
              <p className="text-2xl font-bold text-foreground mb-4">{formatCurrency(total)}</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(["cash", "card", "mobile", "transfer"] as const).map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`px-3 py-2 rounded-lg border text-xs font-medium capitalize ${paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{m}</button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">Recording payment will mark this invoice paid, create a sales receipt, and deduct stock in base units for any matched inventory items.</p>
              <button onClick={() => processPayment(payingInvoice, paymentMethod)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 inline-flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />Confirm & Convert to Receipt
              </button>
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}
