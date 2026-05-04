import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuth } from "@/hooks/use-auth";
import { forwardRef } from "react";
import PrintTheme from "./PrintTheme";

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

  // Always prefer the Company Profile (from Company Setup) so invoices reflect the legal/business name.
  const company = {
    name: companyProfile?.name || settings.appName,
    address: companyProfile?.address || null,
    city: [companyProfile?.city, companyProfile?.country].filter(Boolean).join(", ") || null,
    phone: companyProfile?.phone || null,
    email: companyProfile?.email || null,
  };
  const logoUrl = settings.logoUrl || companyProfile?.logoUrl || null;

  return (
    <PrintTheme
      ref={ref}
      documentType={data.type === "quote" ? "Quote" : "Invoice"}
      documentNumber={data.number}
      company={company}
      logoUrl={logoUrl}
      footer={data.notes ? `Notes: ${data.notes}` : undefined}
    >
      <div>
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
    </PrintTheme>
  );
});

InvoiceTemplate.displayName = "InvoiceTemplate";

export default InvoiceTemplate;
