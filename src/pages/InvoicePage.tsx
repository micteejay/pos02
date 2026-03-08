import { useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import InvoiceTemplate, { InvoiceData, InvoiceItem } from "@/components/InvoiceTemplate";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Printer, Download, Eye, X, FileText } from "lucide-react";
import { useAppSettings } from "@/hooks/use-app-settings";

export default function InvoicePage() {
  const { formatCurrency } = useAppSettings();
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

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item),
    }));
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { description: "", qty: 1, rate: 0 }] }));
  };

  const removeItem = (index: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
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

  const subtotal = form.items.reduce((s, i) => s + i.qty * i.rate, 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create {form.type === "quote" ? "Quote" : "Invoice"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Generate professional quotes and invoices</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Eye className="w-4 h-4" />Preview
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Printer className="w-4 h-4" />Print
            </button>
          </div>
        </div>

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
                      ...prev,
                      type: e.target.value as "quote" | "invoice",
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
                <Input value={form.customerName} onChange={(e) => setForm(prev => ({ ...prev, customerName: e.target.value }))} placeholder="Work In Customer" className="mt-1" />
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
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input value={item.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Item description" />
                  </div>
                  <div className="w-20">
                    <Input type="number" value={item.qty || ""} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} placeholder="Qty" />
                  </div>
                  <div className="w-28">
                    <Input type="number" value={item.rate || ""} onChange={(e) => updateItem(i, { rate: Number(e.target.value) })} placeholder="Rate" />
                  </div>
                  <div className="w-28 flex items-center justify-end">
                    <span className="text-sm font-medium text-foreground">{formatCurrency(item.qty * item.rate)}</span>
                  </div>
                  <button onClick={() => removeItem(i)} disabled={form.items.length === 1} className="p-2 rounded hover:bg-destructive/10 disabled:opacity-30">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
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

      {/* Full Preview Modal */}
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
