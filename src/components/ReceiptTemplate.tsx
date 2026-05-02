import { forwardRef } from "react";

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  unitName?: string;
  unitFactor?: number;
  lineKey?: string;
}

export interface ReceiptData {
  id: string;
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  customer: string;
  method: string;
  items: ReceiptItem[];
  date?: string;
}

export interface CompanyInfo {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface Props {
  sale: ReceiptData;
  company?: CompanyInfo | null;
  formatCurrency: (n: number) => string;
  footer?: string;
  header?: string;
  style?: string;
}

const methodLabel = (m: string) =>
  m === "card" ? "Credit Card" : m === "cash" ? "Cash" : m === "mobile" ? "Mobile Pay" : m;

/**
 * Shared receipt printable. Used by POS (new sale) and Sales (reprint).
 * Reads company branding so the printout always reflects the company profile.
 */
const ReceiptTemplate = forwardRef<HTMLDivElement, Props>(function ReceiptTemplate(
  { sale, company, formatCurrency, footer, header, style = "modern" },
  ref,
) {
  return (
    <div
      ref={ref}
      className="border border-border rounded-lg p-4 font-mono text-[10px] bg-card"
    >
      {(style === "modern" || style === "branded") && (
        <div className="h-1 rounded-full bg-primary mb-2" />
      )}
      <div className="text-center mb-2">
        <p className="font-bold text-xs text-foreground">
          {company?.name || header || "Receipt"}
        </p>
        {company && (
          <p className="text-muted-foreground">
            {[company.address, company.city].filter(Boolean).join(", ")}
            {company.phone ? ` · ${company.phone}` : ""}
          </p>
        )}
      </div>
      <div className="border-t border-dashed border-border my-2" />
      <div className="flex justify-between text-muted-foreground">
        <span>Receipt: {sale.id}</span>
        {sale.date && <span>{sale.date}</span>}
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Customer: {sale.customer}</span>
      </div>
      <div className="border-t border-dashed border-border my-2" />
      {sale.items.map((item, i) => {
        const factor = item.unitFactor || 1;
        return (
          <div key={item.lineKey || `${item.name}-${i}`} className="flex justify-between text-foreground">
            <div className="flex-1 pr-2">
              <div>
                {item.name} ×{item.qty}
                {item.unitName ? ` ${item.unitName}` : ""}
              </div>
              {factor > 1 && (
                <div className="text-[9px] text-muted-foreground">
                  1 {item.unitName} = {factor} base · total {item.qty * factor} base ·{" "}
                  {formatCurrency(item.price)} / {item.unitName}
                </div>
              )}
            </div>
            <span>{formatCurrency(item.price * item.qty)}</span>
          </div>
        );
      })}
      <div className="border-t border-dashed border-border my-2" />
      {sale.subtotal !== undefined && (
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
      )}
      {sale.discount ? (
        <div className="flex justify-between text-muted-foreground">
          <span>Discount</span>
          <span>-{formatCurrency(sale.discount)}</span>
        </div>
      ) : null}
      {sale.tax ? (
        <div className="flex justify-between text-muted-foreground">
          <span>Tax</span>
          <span>{formatCurrency(sale.tax)}</span>
        </div>
      ) : null}
      <div className="flex justify-between font-bold text-foreground text-xs">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground mt-1">
        <span>Payment</span>
        <span>{methodLabel(sale.method)}</span>
      </div>
      {footer && <div className="text-center mt-2 text-muted-foreground">{footer}</div>}
      {style === "branded" && <div className="h-1 rounded-full bg-primary mt-2" />}
    </div>
  );
});

export default ReceiptTemplate;