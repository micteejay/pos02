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
  settings?: any;
  overrideFooter?: string;
}

const methodLabel = (m: string) =>
  m === "card" ? "Credit Card" : m === "cash" ? "Cash" : m === "mobile" ? "Mobile Pay" : m;

const ReceiptTemplate = forwardRef<HTMLDivElement, Props>(function ReceiptTemplate(
  { sale, company, formatCurrency, settings, overrideFooter },
  ref,
) {
  const style = settings?.receiptStyle || "modern";
  const isModern = style === "modern";
  const isMinimal = style === "minimal";
  const isBranded = style === "branded";
  const isCompact = style === "compact";
  const isThermal = style === "thermal";
  const isInvoice = style === "invoice";

  const headerText = settings?.receiptHeader || company?.name || "Receipt";
  const footerText = overrideFooter || settings?.receiptFooter;

  if (isInvoice) {
    return (
      <div ref={ref} className="bg-card border border-border rounded-lg p-5 text-[10px] leading-relaxed max-w-[320px] mx-auto font-sans w-full">
        <div className="flex justify-between items-start mb-4">
          <div><p className="font-bold text-foreground text-sm">{headerText}</p><p className="text-muted-foreground">{[company?.address, company?.city].filter(Boolean).join(", ")}</p></div>
          <div className="text-right"><p className="text-lg font-bold text-primary">INVOICE</p><p className="text-muted-foreground">{sale.id}</p><p className="text-muted-foreground">{sale.date}</p></div>
        </div>
        <div className="border-t border-border pt-2 mb-3"><p className="font-semibold text-foreground mb-1">Bill To:</p><p className="text-muted-foreground">{sale.customer}</p></div>
        <table className="w-full mb-3"><thead><tr className="border-b border-border"><th className="text-left py-1 text-muted-foreground font-medium">Item</th><th className="text-center py-1 text-muted-foreground font-medium">Qty</th><th className="text-right py-1 text-muted-foreground font-medium">Price</th><th className="text-right py-1 text-muted-foreground font-medium">Total</th></tr></thead>
        <tbody>{sale.items.map((item, i) => (<tr key={i} className="border-b border-border/50"><td className="py-1 text-foreground">{item.name} {item.unitName ? `(${item.unitName})` : ''}</td><td className="py-1 text-center text-muted-foreground">{item.qty}</td><td className="py-1 text-right text-muted-foreground">{formatCurrency(item.price)}</td><td className="py-1 text-right text-foreground">{formatCurrency(item.qty * item.price)}</td></tr>))}</tbody></table>
        <div className="border-t border-border pt-2 space-y-0.5">
          {sale.subtotal !== undefined && <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>}
          {sale.discount ? <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{formatCurrency(sale.discount)}</span></div> : null}
          {sale.tax ? <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{formatCurrency(sale.tax)}</span></div> : null}
          <div className="flex justify-between font-bold text-foreground text-xs mt-1 pt-1 border-t border-border"><span>Total Due</span><span>{formatCurrency(sale.total)}</span></div>
        </div>
        {(footerText || settings?.receiptReturnPolicy) && (
          <div className="mt-3 pt-2 border-t border-border text-center text-muted-foreground">
            {footerText && <p>{footerText}</p>}
            {settings?.receiptReturnPolicy && <p className="mt-1 text-[9px]">{settings.receiptReturnPolicy}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`border border-border rounded-lg p-4 font-mono text-[10px] leading-relaxed max-w-[280px] mx-auto bg-card w-full ${isThermal ? "bg-amber-50 dark:bg-amber-950/20 border-dashed" : ""}`}
    >
      {(isModern || isBranded) && <div className="h-1 rounded-full bg-primary mb-3" />}
      
      <div className={`${isMinimal ? "text-left" : "text-center"} mb-3`}>
        {!isMinimal && !isCompact && (
          <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ${isMinimal ? "" : "mx-auto"} mb-1`}>
            {(settings?.appName || company?.name || "R").charAt(0)}
          </div>
        )}
        <p className="font-bold text-foreground text-xs">{headerText}</p>
        {!isCompact && company && (
          <p className="text-muted-foreground">
            {[company.address, company.city].filter(Boolean).join(", ")}
          </p>
        )}
        {!isCompact && company?.phone && <p className="text-muted-foreground">Tel: {company.phone}</p>}
      </div>

      {!isMinimal && <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border mb-2`} />}
      
      <div className="flex justify-between text-muted-foreground mb-1">
        <span>Date: {sale.date?.split(',')[0] || sale.date}</span>
        <span>{sale.id}</span>
      </div>
      <div className="flex justify-between text-muted-foreground mb-2">
        <span>Customer: {sale.customer}</span>
      </div>
      
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border my-2`} />
      
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
      
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border my-2`} />
      
      {sale.subtotal !== undefined && (
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
      )}
      {sale.discount ? (
        <div className="flex justify-between text-muted-foreground text-success">
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
      
      {(isModern || isBranded) && <div className="h-px bg-primary/30 my-1" />}
      
      <div className="flex justify-between font-bold text-foreground text-xs mt-1">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground mt-1">
        <span>Payment</span>
        <span>{methodLabel(sale.method)}</span>
      </div>
      
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border mt-3 pt-2 text-center`}>
        {settings?.showQRCode && !isCompact && (<div className="w-12 h-12 mx-auto mb-2 border border-border rounded flex items-center justify-center text-[8px] text-muted-foreground">QR</div>)}
        {footerText && <p className="text-muted-foreground">{footerText}</p>}
        {settings?.receiptReturnPolicy && !isCompact && <p className="text-muted-foreground mt-1 text-[9px]">{settings.receiptReturnPolicy}</p>}
      </div>
      
      {isBranded && <div className="h-1 rounded-full bg-primary mt-3" />}
    </div>
  );
});

export default ReceiptTemplate;