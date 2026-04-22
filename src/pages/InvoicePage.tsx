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

interface SavedInvoice extends InvoiceData {
  id: string;
  dbId: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  paymentMethod?: string;
}

export default function InvoicePage() {
  const { formatCurrency, settings } = useAppSettings();
  const { inventory, sales, addSale, adjustInventoryQty } = useSharedData();
  const { user } = useAuth();
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

  // Fetch invoices from DB
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data && !error) {
        setSavedInvoices(data.map((inv: any) => ({
          id: inv.number,
          dbId: inv.id,
          type: inv.type as "quote" | "invoice",
          number: inv.number,
          date: new Date(inv.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          customerName: inv.customer_name,
          customerAddress: inv.customer_address || "",
          items: (inv.invoice_items || []).map((item: any) => ({
            description: item.description,
            qty: Number(item.qty),
            rate: Number(item.rate),
            unitName: item.unit_name || undefined,
            unitFactor: Number(item.unit_factor) || 1,
          })),
          serviceChargePercent: Number(inv.service_charge_percent) || 0,
          notes: inv.notes || "",
          status: inv.status as SavedInvoice["status"],
        })));
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
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;
    printWindow.document.write(`
      <html><head><title>${form.type === "quote" ? "Quote" : "Invoice"} ${form.number}</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui, sans-serif; }</style>
      </head><body>${printRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSaveAndRecord = async () => {
    if (!form.customerName || form.items.every(i => !i.description)) {
      toast.error("Please add customer name and at least one item.");
      return;
    }

    // Save invoice to DB
    const { data: newInv, error } = await supabase.from("invoices").insert({
      number: form.number,
      type: form.type as any,
      customer_name: form.customerName,
      customer_address: form.customerAddress || null,
      date: new Date().toISOString().split("T")[0],
      notes: form.notes || null,
      service_charge_percent: form.serviceChargePercent || 0,
      status: "draft" as any,
      created_by: user?.id || null,
      company_id: user?.companyId || null,
    }).select().single();

    if (!newInv || error) {
      toast.error("Failed to save invoice: " + (error?.message || "Unknown error"));
      return;
    }

    // Insert line items
    const lineItems = form.items.filter(i => i.description).map(i => {
      const invItem = inventory.find(p => p.name.toLowerCase() === i.description.toLowerCase());
      return {
        invoice_id: newInv.id,
        description: i.description,
        qty: i.qty,
        rate: i.rate,
        inventory_item_id: invItem?.id || null,
      };
    });

    if (lineItems.length > 0) {
      await supabase.from("invoice_items").insert(lineItems);
    }

    // Add to local state
    setSavedInvoices(prev => [{
      ...form, id: form.number, dbId: newInv.id, status: "draft",
    }, ...prev]);

    // If invoice type, record as a sale and deduct inventory
    if (form.type === "invoice") {
      const saleItems = form.items.filter(i => i.description).map(i => {
        const invItem = inventory.find(p => p.name.toLowerCase() === i.description.toLowerCase());
        return { name: i.description, sku: invItem?.sku || "CUSTOM", qty: i.qty, price: i.rate };
      });

      const subtotal = form.items.reduce((s, i) => s + i.qty * i.rate, 0);
      const serviceCharge = form.serviceChargePercent ? subtotal * (form.serviceChargePercent / 100) : 0;

      addSale({
        items: saleItems,
        total: subtotal + serviceCharge,
        customer: form.customerName,
        method: "Invoice",
        store: "Invoice",
        createdBy: user?.name || "System",
        createdByRole: user?.role || "",
      });

      form.items.forEach(item => {
        const invItem = inventory.find(p => p.name.toLowerCase() === item.description.toLowerCase());
        if (invItem) adjustInventoryQty(invItem.sku, -item.qty);
      });

      // Update invoice status
      await supabase.from("invoices").update({ status: "sent" as any, sale_id: null }).eq("id", newInv.id);

      toast.success(`Invoice ${form.number} saved and recorded as a sale.`);
    } else {
      toast.success(`Quote ${form.number} saved as draft.`);
    }

    // Reset form
    setForm({
      type: form.type,
      number: `${form.type === "quote" ? "QT" : "INV"}-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      customerName: "", customerAddress: "",
      items: [{ description: "", qty: 1, rate: 0 }],
      serviceChargePercent: 0, notes: "",
    });
  };

  const convertQuoteToInvoice = async (index: number) => {
    const inv = savedInvoices[index];
    if (!inv) return;
    const newNum = `INV-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`;
    
    await supabase.from("invoices").update({
      type: "invoice" as any,
      number: newNum,
      status: "sent" as any,
    }).eq("id", inv.dbId);

    setSavedInvoices(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, type: "invoice" as const, number: newNum, id: newNum, status: "sent" as const };
    }));
    toast.success("Quote converted to invoice.");
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
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedInvoices.map((inv, idx) => (
                  <div key={inv.dbId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <span className="text-sm font-medium text-foreground">{inv.number}</span>
                      <span className="text-xs text-muted-foreground ml-2">{inv.customerName} · {formatCurrency(inv.items.reduce((s, i) => s + i.qty * i.rate, 0))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-success/10 text-success" : inv.status === "sent" ? "bg-info/10 text-info" : inv.type === "invoice" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {inv.status} · {inv.type}
                      </span>
                      {inv.type === "quote" && inv.status === "draft" && (
                        <button onClick={() => convertQuoteToInvoice(idx)} className="text-xs text-primary hover:underline">Convert to Invoice</button>
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
              <div>
                <label className="text-xs font-medium text-muted-foreground">Customer Name</label>
                <Input value={form.customerName} onChange={(e) => setForm(prev => ({ ...prev, customerName: e.target.value }))} placeholder="Walk In Customer" className="mt-1" />
              </div>
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
          </div>

          {/* Live Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Live Preview</h3>
              <div className="transform scale-[0.85] origin-top">
                <InvoiceTemplate ref={printRef} data={form} />
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
    </AppLayout>
  );
}
