import { useMemo, useRef, useState } from "react";
import { Upload, X, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSharedData, type InventoryItem } from "@/hooks/use-shared-data";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Each target field on InventoryItem we accept from CSV. */
const TARGET_FIELDS: { key: string; label: string; required: boolean; aliases: string[] }[] = [
  { key: "name", label: "Name", required: true, aliases: ["name", "product", "title", "item"] },
  { key: "sku", label: "SKU", required: true, aliases: ["sku", "code", "product_code", "item_code"] },
  { key: "category", label: "Category", required: false, aliases: ["category", "type", "group"] },
  { key: "price", label: "Selling Price", required: true, aliases: ["price", "selling_price", "sale_price", "rate"] },
  { key: "costPrice", label: "Cost Price", required: false, aliases: ["cost_price", "cost", "buy_price", "purchase_price"] },
  { key: "qty", label: "Quantity", required: false, aliases: ["qty", "quantity", "stock", "on_hand"] },
  { key: "reorder", label: "Reorder Point", required: false, aliases: ["reorder", "reorder_point", "min_stock", "threshold"] },
  { key: "barcode", label: "Barcode", required: false, aliases: ["barcode", "ean", "upc", "gtin"] },
  { key: "baseUnit", label: "Base Unit", required: false, aliases: ["unit", "base_unit", "uom"] },
  { key: "packSize", label: "Pack Size", required: false, aliases: ["pack_size", "pack", "units_per_pack"] },
  { key: "warehouse", label: "Warehouse", required: false, aliases: ["warehouse", "location", "store"] },
];

type FieldKey = string;

interface ParsedRow {
  raw: Record<string, string>;
  mapped: Partial<InventoryItem> & { sku: string; name: string };
  errors: string[];
}

/** Tiny CSV parser supporting quoted fields with embedded commas/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.some((c) => c.length > 0)) rows.push(cur);
        cur = [];
      } else field += ch;
    }
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function autoMap(headers: string[]): Record<FieldKey, number | -1> {
  const map = {} as Record<FieldKey, number | -1>;
  TARGET_FIELDS.forEach((f) => {
    const idx = headers.findIndex((h) => {
      const norm = h.toLowerCase().trim().replace(/\s+/g, "_");
      return f.aliases.includes(norm as any);
    });
    map[f.key] = idx;
  });
  return map;
}

export function InventoryCsvImport({ open, onClose }: Props) {
  const { addInventoryItem, inventory } = useSharedData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number | -1>>({} as any);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setHeaders([]); setRows([]); setMapping({} as any);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("CSV file is too large (max 5 MB)"); return; }
    const text = await file.text();
    const all = parseCsv(text);
    if (all.length < 2) { toast.error("CSV is empty or only contains headers"); return; }
    const [hdr, ...body] = all;
    setHeaders(hdr);
    setRows(body);
    setMapping(autoMap(hdr));
  };

  const downloadTemplate = () => {
    const headerRow = TARGET_FIELDS.map((f) => f.key).join(",");
    const sample = "Sample Coffee,SKU-001,Beverages,12.50,8.00,100,20,1234567890123,pcs,1,Main Warehouse";
    const blob = new Blob([headerRow + "\n" + sample + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "inventory-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parsedRows: ParsedRow[] = useMemo(() => {
    if (!rows.length) return [];
    const skuIdx = mapping.sku;
    const nameIdx = mapping.name;
    const priceIdx = mapping.price;
    const seenSkus = new Set<string>();

    return rows.map((cells) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, i) => { raw[h] = (cells[i] || "").trim(); });

      const errors: string[] = [];
      const get = (idx: number) => (idx >= 0 ? (cells[idx] || "").trim() : "");
      const num = (s: string) => {
        const n = Number(s.replace(/[^0-9.\-]/g, ""));
        return Number.isFinite(n) ? n : NaN;
      };

      const sku = get(skuIdx);
      const name = get(nameIdx);
      const price = num(get(priceIdx));
      const qty = mapping.qty >= 0 ? num(get(mapping.qty)) : 0;
      const reorder = mapping.reorder >= 0 ? num(get(mapping.reorder)) : 10;
      const cost = mapping.costPrice >= 0 ? num(get(mapping.costPrice)) : 0;
      const packSize = mapping.packSize >= 0 ? num(get(mapping.packSize)) : 1;

      if (!sku) errors.push("Missing SKU");
      if (!name) errors.push("Missing Name");
      if (!Number.isFinite(price) || price < 0) errors.push("Price must be ≥ 0");
      if (mapping.qty >= 0 && (!Number.isFinite(qty) || qty < 0)) errors.push("Qty must be ≥ 0");
      if (mapping.costPrice >= 0 && cost < 0) errors.push("Cost cannot be negative");
      if (sku && seenSkus.has(sku.toLowerCase())) errors.push("Duplicate SKU in file");
      if (sku) seenSkus.add(sku.toLowerCase());
      if (sku && inventory.some((i) => i.sku.toLowerCase() === sku.toLowerCase())) {
        errors.push("SKU already exists in inventory");
      }

      const mapped = {
        sku, name,
        category: mapping.category >= 0 ? get(mapping.category) || "Uncategorized" : "Uncategorized",
        price: Number.isFinite(price) ? price : 0,
        costPrice: Number.isFinite(cost) ? cost : 0,
        qty: Number.isFinite(qty) ? Math.floor(qty) : 0,
        reorder: Number.isFinite(reorder) ? Math.floor(reorder) : 10,
        barcode: mapping.barcode >= 0 ? get(mapping.barcode) || undefined : undefined,
        baseUnit: mapping.baseUnit >= 0 ? get(mapping.baseUnit) || "pcs" : "pcs",
        packSize: Number.isFinite(packSize) && packSize >= 1 ? Math.floor(packSize) : 1,
        warehouse: mapping.warehouse >= 0 ? get(mapping.warehouse) || "" : "",
        units: [],
        status: "ok" as const,
      } satisfies Partial<InventoryItem> & { sku: string; name: string };

      return { raw, mapped, errors };
    });
  }, [rows, headers, mapping, inventory]);

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const allRequiredMapped = TARGET_FIELDS.filter((f) => f.required).every(
    (f) => mapping[f.key] !== undefined && mapping[f.key] >= 0
  );

  const importValid = async () => {
    if (!validRows.length) return;
    setImporting(true);
    let success = 0;
    for (const row of validRows) {
      try {
        await addInventoryItem(row.mapped as InventoryItem);
        success++;
      } catch (e) {
        console.error("Failed row", row, e);
      }
    }
    setImporting(false);
    toast.success(`Imported ${success} of ${validRows.length} items`);
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Import Inventory from CSV
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a CSV — we auto-map columns by header name, then preview before committing.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!rows.length ? (
          <div className="space-y-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-12 hover:border-primary/40 hover:bg-muted/30 transition-colors flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Click to choose a CSV file</p>
              <p className="text-xs text-muted-foreground">Max 5 MB. UTF-8 encoded.</p>
            </button>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <button
              onClick={downloadTemplate}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Download CSV template
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mapping editor */}
            <div className="glass-card rounded-lg p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Column Mapping</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TARGET_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground min-w-[110px]">
                      {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                    </label>
                    <select
                      value={mapping[f.key] ?? -1}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: Number(e.target.value) }))}
                      className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    >
                      <option value={-1}>— Skip —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!allRequiredMapped && (
                <p className="text-xs text-destructive mt-3 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Map all required fields (marked *) before importing.
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryStat icon={CheckCircle2} label="Valid" value={validRows.length} className="text-success bg-success/10" />
              <SummaryStat icon={AlertCircle} label="With errors" value={invalidRows.length} className="text-destructive bg-destructive/10" />
              <SummaryStat icon={FileSpreadsheet} label="Total rows" value={parsedRows.length} className="text-primary bg-primary/10" />
            </div>

            {/* Preview table */}
            <div className="glass-card rounded-lg overflow-hidden">
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-muted-foreground">#</th>
                      <th className="text-left px-3 py-2 text-muted-foreground">SKU</th>
                      <th className="text-left px-3 py-2 text-muted-foreground">Name</th>
                      <th className="text-right px-3 py-2 text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 text-muted-foreground">Price</th>
                      <th className="text-left px-3 py-2 text-muted-foreground">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 200).map((r, i) => (
                      <tr key={i} className={`border-b border-border/40 ${r.errors.length ? "bg-destructive/5" : ""}`}>
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 text-foreground font-mono">{r.mapped.sku || "—"}</td>
                        <td className="px-3 py-1.5 text-foreground">{r.mapped.name || "—"}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{r.mapped.qty ?? 0}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{r.mapped.price ?? 0}</td>
                        <td className="px-3 py-1.5 text-destructive">{r.errors.join("; ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 200 && (
                  <p className="text-[10px] text-center text-muted-foreground py-2">
                    Showing first 200 of {parsedRows.length} rows. All rows will be processed on import.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline">
                Choose a different file
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancel</button>
                <button
                  onClick={importValid}
                  disabled={!allRequiredMapped || !validRows.length || importing}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import {validRows.length} valid row{validRows.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, className }: { icon: any; label: string; value: number; className: string }) {
  return (
    <div className={`rounded-lg p-3 flex items-center gap-3 ${className}`}>
      <Icon className="w-5 h-5" />
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[10px] opacity-80">{label}</p>
      </div>
    </div>
  );
}