import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuth } from "@/hooks/use-auth";
import { forwardRef } from "react";

export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  /** Optional selling unit name (e.g. "Box") */
  unitName?: string;
  /** Base units per 1 selling unit. Defaults to 1. */
  unitFactor?: number;
}

export interface InvoiceData {
  type: "quote" | "invoice";
  number: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  items: InvoiceItem[];
  serviceChargePercent?: number;
  notes?: string;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
}

const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ data }, ref) => {
  const { settings, formatCurrency } = useAppSettings();
  const { companyProfile } = useAuth();

  const subtotal = data.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const serviceCharge = data.serviceChargePercent ? subtotal * (data.serviceChargePercent / 100) : 0;
  const taxAmount = subtotal * (settings.taxRate / 100);
  const total = subtotal + serviceCharge;

  // Always prefer the Company Profile name (from Company Setup) so invoices reflect the legal/business name.
  const companyName = companyProfile?.name || settings.appName;
  const companyAddress = companyProfile
    ? [companyProfile.address, companyProfile.city, companyProfile.country].filter(Boolean).join("\n")
    : "";
  const companyPhone = companyProfile?.phone || "";
  const companyEmail = companyProfile?.email || "";

  return (
    <div ref={ref} className="bg-card border border-border rounded-xl overflow-hidden font-sans max-w-3xl mx-auto" style={{ fontSize: "13px" }}>
      {/* Header Wave */}
      <div className="relative h-16 overflow-hidden">
        <svg viewBox="0 0 800 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M0 0 H800 V60 Q700 100 600 70 Q500 40 400 60 Q300 80 200 50 Q100 20 0 40 Z" fill="hsl(var(--primary))" />
          <path d="M0 0 H800 V40 Q700 80 600 50 Q500 20 400 40 Q300 60 200 30 Q100 0 0 20 Z" fill="hsl(var(--primary))" opacity="0.6" />
        </svg>
      </div>

      <div className="px-8 pb-8">
        {/* Company Info + Doc Type */}
        <div className="flex justify-between items-start -mt-4 mb-6">
          <div className="flex items-start gap-4">
            {(settings.logoUrl || companyProfile?.logoUrl) ? (
              <img src={settings.logoUrl || companyProfile?.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-border bg-card" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-border">
                <span className="text-xl font-bold text-primary">{companyName.charAt(0)}</span>
              </div>
            )}
            <div className="mt-2">
              <h2 className="font-bold text-foreground text-base">{companyName}</h2>
              {companyAddress && <p className="text-muted-foreground text-xs whitespace-pre-line leading-relaxed">{companyAddress}</p>}
              {companyPhone && <p className="text-muted-foreground text-xs">{companyPhone}</p>}
              {companyEmail && <p className="text-muted-foreground text-xs">{companyEmail}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-foreground capitalize">{data.type}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1"># {data.number}</p>
          </div>
        </div>

        {/* Bill To + Date */}
        <div className="flex justify-between items-start mb-6 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Bill To</p>
            <p className="font-semibold text-foreground">{data.customerName}</p>
            {data.customerAddress && <p className="text-xs text-muted-foreground">{data.customerAddress}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{data.type === "quote" ? "Quote" : "Invoice"} Date :</p>
            <p className="font-medium text-foreground">{data.date}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-4">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="text-left py-2.5 px-3 text-xs font-semibold rounded-tl-lg w-10">#</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold">Item & Description</th>
              <th className="text-center py-2.5 px-3 text-xs font-semibold w-20">Qty</th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold w-28">Rate</th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold rounded-tr-lg w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-3 px-3 text-muted-foreground text-center">{i + 1}</td>
                <td className="py-3 px-3 text-foreground">
                  {item.description}
                  {item.unitName && (item.unitFactor || 1) > 1 && (
                    <div className="text-[10px] text-muted-foreground">
                      Sold as {item.unitName} · 1 {item.unitName} = {item.unitFactor} base
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-center text-muted-foreground">
                  {item.qty.toFixed(2)}{item.unitName ? ` ${item.unitName}` : ""}
                </td>
                <td className="py-3 px-3 text-right text-muted-foreground">
                  {formatCurrency(item.rate)}{item.unitName ? ` / ${item.unitName}` : ""}
                </td>
                <td className="py-3 px-3 text-right font-medium text-foreground">{formatCurrency(item.qty * item.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-72 space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground px-3">
              <span>Sub Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {data.serviceChargePercent && data.serviceChargePercent > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground px-3">
                <span>Service Charge ({data.serviceChargePercent}%)</span>
                <span>{formatCurrency(serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-foreground bg-primary/10 rounded-lg px-3 py-2.5 mt-2">
              <span>Total</span>
              <span>{settings.currency}{formatCurrency(total).replace(settings.currencySymbol, "")}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-primary mb-1">Notes</p>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{data.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = "InvoiceTemplate";

export default InvoiceTemplate;
