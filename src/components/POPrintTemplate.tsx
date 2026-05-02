import { forwardRef } from "react";
import type { CompanyInfo } from "./ReceiptTemplate";

export interface POItem {
  name: string;
  qty: number;
  unitPrice: number;
  unitName?: string;
  unitFactor?: number;
}

export interface POPrintData {
  po_number: string;
  supplier_name: string;
  warehouse?: string;
  notes?: string;
  status: string;
  created: string;
  expectedDelivery?: string;
  total: number;
  approvedBy?: string | null;
  items: POItem[];
}

interface Props {
  po: POPrintData;
  company?: CompanyInfo | null;
  formatCurrency: (n: number) => string;
}

/**
 * Printable Purchase Order document. Pulls branding from the company profile
 * and renders one row per line item with selected-unit qty/price reconstructed
 * from base values.
 */
const POPrintTemplate = forwardRef<HTMLDivElement, Props>(function POPrintTemplate(
  { po, company, formatCurrency },
  ref,
) {
  return (
    <div ref={ref} className="bg-card text-foreground p-6 text-xs max-w-[800px] mx-auto">
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold">{company?.name || "Purchase Order"}</h1>
          {company && (
            <p className="text-muted-foreground mt-1">
              {[company.address, company.city].filter(Boolean).join(", ")}
              {company.phone ? ` · ${company.phone}` : ""}
              {company.email ? ` · ${company.email}` : ""}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-bold text-primary">{po.po_number}</p>
          <p className="text-muted-foreground capitalize">Status: {po.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-muted-foreground">Supplier</p>
          <p className="font-semibold">{po.supplier_name}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Created</p>
          <p className="font-semibold">{po.created}</p>
          {po.expectedDelivery && po.expectedDelivery !== "—" && (
            <p className="text-muted-foreground mt-1">ETA: {po.expectedDelivery}</p>
          )}
        </div>
      </div>

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2">Item</th>
            <th className="text-right py-2">Qty</th>
            <th className="text-right py-2">Unit Price</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((item, i) => {
            const factor = item.unitFactor || 1;
            const displayQty =
              factor > 1
                ? `${(item.qty / factor).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${item.unitName}`
                : `${item.qty}`;
            const displayPrice =
              factor > 1
                ? `${formatCurrency(item.unitPrice * factor)} / ${item.unitName}`
                : formatCurrency(item.unitPrice);
            return (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2">
                  {item.name}
                  {factor > 1 && (
                    <div className="text-[10px] text-muted-foreground">
                      1 {item.unitName} = {factor} base
                    </div>
                  )}
                </td>
                <td className="text-right py-2">{displayQty}</td>
                <td className="text-right py-2">{displayPrice}</td>
                <td className="text-right py-2 font-medium">
                  {formatCurrency(item.qty * item.unitPrice)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border">
            <td colSpan={3} className="text-right py-2 font-bold">TOTAL</td>
            <td className="text-right py-2 font-bold">{formatCurrency(po.total)}</td>
          </tr>
        </tfoot>
      </table>

      {po.notes && (
        <div className="mb-4">
          <p className="text-muted-foreground">Notes</p>
          <p>{po.notes}</p>
        </div>
      )}
      {po.approvedBy && (
        <p className="text-muted-foreground">
          Approved by: <span className="font-medium text-foreground">{po.approvedBy}</span>
        </p>
      )}
    </div>
  );
});

export default POPrintTemplate;