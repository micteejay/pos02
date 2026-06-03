import { forwardRef, Fragment } from "react";

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
  payments?: Array<{ method: string; amount: number; reference?: string }>;
  amountTendered?: number;
  change?: number;
  balanceDue?: number;
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

  // Page size — how many items per "section" before we repeat the column
  // header and insert a print page-break. Keeps long receipts (20+ items)
  // readable both on screen and when printed on Letter / A4.
  const PAGE_SIZE = Number(settings?.receiptPageSize) || 25;
  const itemChunks: typeof sale.items[] = [];
  for (let i = 0; i < sale.items.length; i += PAGE_SIZE) {
    itemChunks.push(sale.items.slice(i, i + PAGE_SIZE));
  }
  if (itemChunks.length === 0) itemChunks.push([]);

  const ColumnHeader = () => (
    <>
      <div className="grid grid-cols-[2ch_1fr_5ch_6ch] gap-1 text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
        <span className="text-right">QTY</span>
        <span>DESCRIPTION</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">TOTAL</span>
      </div>
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border mb-1`} />
    </>
  );

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

      <div className="text-center mb-2">
        <p className="font-bold text-foreground text-sm tracking-[0.2em]">CASH RECEIPT</p>
        <p className="font-bold text-foreground text-[11px] mt-0.5">{headerText}</p>
        {!isCompact && company && (
          <p className="text-muted-foreground">
            {[company.address, company.city].filter(Boolean).join(", ")}
          </p>
        )}
        {!isCompact && company?.phone && <p className="text-muted-foreground">Tel: {company.phone}</p>}
      </div>

      {!isMinimal && <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border mb-2`} />}

      <div className="flex justify-between text-muted-foreground mb-0.5">
        <span>RECEIPT: {sale.id}</span>
        <span>{sale.date?.split(',')[0] || sale.date}</span>
      </div>
      {sale.date?.includes(',') && (
        <div className="flex justify-end text-muted-foreground mb-0.5">
          <span>TIME: {sale.date.split(',').slice(1).join(',').trim()}</span>
        </div>
      )}
      <div className="flex justify-between text-muted-foreground mb-2">
        <span>CUSTOMER: {sale.customer}</span>
      </div>

      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border mb-1`} />

      {/* Initial column header (first chunk) */}
      <ColumnHeader />

      {/* Items — paginated into sections that repeat the column header and
          break cleanly across printed pages for long receipts. */}
      {itemChunks.map((chunk, chunkIdx) => {
        const startIdx = chunkIdx * PAGE_SIZE;
        return (
          <Fragment key={`chunk-${chunkIdx}`}>
            {chunkIdx > 0 && (
              <>
                <div className="break-before-page" />
                <p className="text-center text-[9px] text-muted-foreground/80 italic my-2">
                  — continued (page {chunkIdx + 1} of {itemChunks.length}) —
                </p>
                <ColumnHeader />
              </>
            )}
            {chunk.map((item, i) => (
              <div
                key={item.lineKey || `${item.name}-${startIdx + i}`}
                className="grid grid-cols-[2ch_1fr_5ch_6ch] gap-1 text-foreground py-[1px] items-start break-inside-avoid"
              >
                <span className="text-right tabular-nums">{item.qty}</span>
                <span className="break-words leading-tight">
                  {item.name}
                  {item.unitName ? ` (${item.unitName})` : ""}
                </span>
                <span className="text-right tabular-nums">{formatCurrency(item.price)}</span>
                <span className="text-right tabular-nums">{formatCurrency(item.price * item.qty)}</span>
              </div>
            ))}
          </Fragment>
        );
      })}

      {itemChunks.length > 1 && (
        <p className="text-center text-[9px] text-muted-foreground/80 italic mt-1">
          — end of items ({sale.items.length} total) —
        </p>
      )}

      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border my-2 break-before-avoid`} />
      
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
      {sale.payments && sale.payments.length > 0 ? (
        <div className="mt-1 space-y-0.5">
          {sale.payments.map((p, i) => (
            <div key={i}>
              <div className="flex justify-between text-muted-foreground">
                <span>{methodLabel(p.method)}</span>
                <span>{formatCurrency(p.amount)}</span>
              </div>
              {p.reference && <p className="text-[8px] text-muted-foreground/80 pl-1">ref: {p.reference}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-between text-muted-foreground mt-1">
          <span>Payment</span>
          <span>{methodLabel(sale.method)}</span>
        </div>
      )}
      {typeof sale.amountTendered === "number" && sale.amountTendered > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Tendered</span>
          <span>{formatCurrency(sale.amountTendered)}</span>
        </div>
      )}
      {typeof sale.change === "number" && sale.change > 0 && (
        <div className="flex justify-between text-success">
          <span>Change</span>
          <span>{formatCurrency(sale.change)}</span>
        </div>
      )}
      {typeof sale.balanceDue === "number" && sale.balanceDue > 0 && (
        <div className="flex justify-between font-bold text-warning">
          <span>Balance Due</span>
          <span>{formatCurrency(sale.balanceDue)}</span>
        </div>
      )}
      
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