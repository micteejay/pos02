import { forwardRef } from "react";
import type { CompanyInfo } from "./ReceiptTemplate";
import PrintTheme from "./PrintTheme";

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
    <PrintTheme
      ref={ref}
      documentType="Purchase Order"
      documentNumber={po.po_number}
      statusLabel={`Status: ${po.status}`}
      company={company}
      footer={po.approvedBy ? `Approved by: ${po.approvedBy}` : undefined}
    >
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
    </PrintTheme>
  );
});

export default POPrintTemplate;