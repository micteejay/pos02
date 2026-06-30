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
  cashier?: string;
  workstation?: string;
  amountTendered?: number;
  changeGiven?: number;
  debitCardAmount?: number;
  payments?: Array<{ method: string; amount: number; reference?: string }>;
  change?: number;
  balanceDue?: number;
}

export interface CompanyInfo {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
}

interface Props {
  sale: ReceiptData;
  company?: CompanyInfo | null;
  formatCurrency: (n: number) => string;
  settings?: any;
  overrideFooter?: string;
  showBarcode?: boolean;
  barcodeNumber?: string;
  receiptSize?: 'small' | 'medium' | 'large';
  customColors?: {
    primary?: string;
    secondary?: string;
    background?: string;
  };
}

const methodLabel = (m: string) =>
  m === "card" ? "Credit Card" : m === "cash" ? "Cash" : m === "mobile" ? "Mobile Pay" : m;

const ReceiptTemplate = forwardRef<HTMLDivElement, Props>(function ReceiptTemplate(
  { sale, company, formatCurrency: originalFormatCurrency, settings, overrideFooter, showBarcode, barcodeNumber },
  ref,
) {
  const formatCurrency = (n: number) => originalFormatCurrency(n).replace(/\.00$/, '');
  const style = settings?.receiptStyle || "classic";
  const isModern = style === "modern";
  const isClassic = style === "classic";
  const isMinimal = style === "minimal";
  const isBranded = style === "branded";
  const isCompact = style === "compact";
  const isThermal = style === "thermal";
  const isInvoice = style === "invoice";

  const paperWidth = settings?.paperWidth || "80mm";
  const sizeClasses = {
    "58mm": "max-w-[220px] p-2",
    "80mm": "max-w-[300px] p-4",
    "A4": "max-w-[800px] p-8",
  }[paperWidth as string] || "max-w-[300px] p-4";

  const customColors = settings?.customColors || {};
  const primaryColor = customColors.primary || 'currentColor';
  const backgroundColor = customColors.background || 'bg-white';

  const fontSizeClass =
    settings?.fontSize === "Small" ? "text-[7.5px]" :
      settings?.fontSize === "Large" ? "text-[10px]" : "text-[8.5px]";

  const headerText = settings?.receiptHeader || company?.name || "Receipt";
  const footerText = overrideFooter || settings?.receiptFooter;

  // Page size — how many items per "section" before we repeat the column
  // header and insert a print page-break. Keeps long receipts (20+ items)
  // readable both on screen and when printed on Letter / A4.
  // For roll printers (80mm/58mm), we do not want page breaks (which trigger printer cutting).
  const isRollPrinter = paperWidth !== "A4";
  const PAGE_SIZE = isRollPrinter ? 999999 : (Number(settings?.receiptPageSize) || 25);
  const itemChunks: typeof sale.items[] = [];
  for (let i = 0; i < sale.items.length; i += PAGE_SIZE) {
    itemChunks.push(sale.items.slice(i, i + PAGE_SIZE));
  }
  if (itemChunks.length === 0) itemChunks.push([]);

  const ColumnHeader = () => (
    <>
      <div
        className="text-[11px] font-bold text-black mb-1 flex justify-between"
      >
        <span style={{ width: "45%", textAlign: "left" }}>Desc</span>
        <span style={{ width: "25%", textAlign: "left" }}>UPrice</span>
        <span style={{ width: "10%", textAlign: "left" }}>Qty</span>
        <span style={{ width: "20%", textAlign: "left" }}>Amt</span>
      </div>
    </>
  );

  if (isInvoice) {
    return (
      <div
        ref={ref}
        className={`bg-white border-2 border-black rounded-lg font-sans ${sizeClasses} leading-relaxed mx-auto w-full`}
      >
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {company?.logoUrl && (
              <img
                src={company.logoUrl}
                alt="Company Logo"
                className="mb-2 h-12 w-auto object-contain"
              />
            )}
            <p className="font-bold text-black text-base mb-1">{headerText}</p>
            <p className="text-black text-[10px]">{[company?.address, company?.city].filter(Boolean).join(", ")}</p>
            {company?.phone && <p className="text-black text-[10px]">Tel: {company.phone}</p>}
            {company?.email && <p className="text-black text-[10px]">{company.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-black mb-1">INVOICE</p>
            <p className="text-black text-[10px]">#{sale.id}</p>
            <p className="text-black text-[10px]">{sale.date}</p>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="border-t-2 border-black pt-3 mb-4">
          <p className="font-semibold text-black text-[10px] mb-1">Bill To:</p>
          <p className="text-black text-[10px]">{sale.customer}</p>
        </div>

        {/* Items Table */}
        <table className="w-full mb-4">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 text-black text-[10px] font-semibold">Item</th>
              <th className="text-center py-2 text-black text-[10px] font-semibold">Qty</th>
              <th className="text-right py-2 text-black text-[10px] font-semibold">Price</th>
              <th className="text-right py-2 text-black text-[10px] font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, i) => (
              <tr key={i} className="border-b border-black/30">
                <td className="py-2 text-black text-[10px]">{item.name} {item.unitName ? `(${item.unitName})` : ''}</td>
                <td className="py-2 text-center text-black text-[10px]">{item.qty}</td>
                <td className="py-2 text-right text-black text-[10px]">{formatCurrency(item.price)}</td>
                <td className="py-2 text-right text-black text-[10px] font-semibold">{formatCurrency(item.qty * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="border-t-2 border-black pt-3 space-y-1.5">
          {sale.subtotal !== undefined && (
            <div className="flex justify-between text-black">
              <span className="text-[10px]">Subtotal</span>
              <span className="text-[10px]">{formatCurrency(sale.subtotal)}</span>
            </div>
          )}
          {sale.discount && (
            <div className="flex justify-between text-black">
              <span className="text-[10px]">Discount</span>
              <span className="text-[10px]">-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          {sale.tax && (
            <div className="flex justify-between text-black">
              <span className="text-[10px]">Tax</span>
              <span className="text-[10px]">{formatCurrency(sale.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-black text-base mt-2 pt-2 border-t border-black">
            <span>Total Due</span>
            <span className="text-black">{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {/* Footer */}
        {(footerText || settings?.receiptReturnPolicy) && (
          <div className="mt-4 pt-3 border-t border-black text-center">
            {footerText && <p className="text-black text-[10px] mb-1 font-semibold">{footerText}</p>}
            {settings?.receiptReturnPolicy && <p className="text-black text-[9px]">{settings.receiptReturnPolicy}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`bg-white text-black font-sans ${fontSizeClass} leading-snug ${sizeClasses} mx-auto w-full receipt-container`}
    >
      {(isModern || isBranded) && <div className="h-1 bg-black mb-2" />}
      {/* Header Section */}
      <div className={`${isMinimal ? "text-left" : "text-center"} mb-2`}>
        {!isMinimal && !isCompact && company?.logoUrl && (
          <img
            src={company.logoUrl}
            alt="Company Logo"
            className={`${isMinimal ? "mx-0" : "mx-auto"} mb-2 h-12 w-auto object-contain max-w-full`}
          />
        )}
        <p className="font-bold text-black text-base leading-tight tracking-wide">{headerText}</p>
        {settings?.receiptTagline && (
          <p className="text-black text-[10px] leading-tight mt-0.5">… {settings.receiptTagline}</p>
        )}
        {!isCompact && company && (company.address || company.city) && (
          <p className="text-black text-[10px] leading-tight mt-0.5">
            {[company.address, company.city].filter(Boolean).join(", ")}
          </p>
        )}
        {!isCompact && company?.phone && (
          <p className="text-black text-[10px] leading-tight mt-0.5">{company.phone}</p>
        )}
      </div>

      {/* Left-aligned meta */}
      <div className="mb-2 space-y-[2px]">
        {sale.cashier && <p className="text-black"><span className="font-semibold">Sales Rep/Cashier:</span> {sale.cashier}</p>}
        {sale.date && <p className="text-black"><span className="font-semibold">Date:</span> {sale.date}</p>}
        <p className="text-black"><span className="font-semibold">Customer:</span> {sale.customer}</p>
        <p className="text-black"><span className="font-semibold">Payment Method:</span> {methodLabel(sale.method)}</p>
      </div>

      <p className={`${isMinimal ? "text-left" : "text-center"} text-black mb-1`}><span className="font-semibold">{settings?.receiptNumberLabel || "Receipt No"}:</span> {sale.id}</p>

      {!isMinimal && <div className={`border-t ${isThermal ? "border-dashed" : "border-solid"} border-black mb-2`} />}

      {/* Column header */}
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
                <p className="text-center text-[9px] text-black/80 italic my-2">
                  — continued (page {chunkIdx + 1} of {itemChunks.length}) —
                </p>
                <ColumnHeader />
              </>
            )}
            {chunk.map((item, i) => (
              <div
                key={item.lineKey || `${item.name}-${startIdx + i}`}
                className="text-black py-[2px] items-start break-inside-avoid flex justify-between"
              >
                <span className="break-words leading-tight pr-1" style={{ width: "45%", textAlign: "left" }}>
                  {item.name}
                  {item.unitName ? ` (${item.unitName})` : ""}
                </span>
                <span className="tabular-nums" style={{ width: "25%", textAlign: "left" }}>{formatCurrency(item.price)}</span>
                <span className="tabular-nums" style={{ width: "10%", textAlign: "left" }}>{item.qty}</span>
                <span className="tabular-nums" style={{ width: "20%", textAlign: "left" }}>{formatCurrency(item.price * item.qty)}</span>
              </div>
            ))}
          </Fragment>
        );
      })}

      {itemChunks.length > 1 && (
        <p className="text-center text-[9px] text-black/80 italic mt-1">
          — end of items ({sale.items.length} total) —
        </p>
      )}

      {/* Totals — custom layout as requested */}
      <div className="mt-3 text-black font-bold text-[12px]">
        <div className="flex justify-between items-center mb-[2px]">
          <p>Total: {formatCurrency(sale.total)}</p>
          <p>Amt Paid: {formatCurrency(typeof sale.amountTendered === "number" && sale.amountTendered > 0 ? sale.amountTendered : (sale.total - (sale.balanceDue || 0)))}</p>
        </div>
        <div className="text-right space-y-[2px]">
          <p>Cust Balance: {formatCurrency(sale.balanceDue ?? 0)}</p>
          {(sale.changeGiven ?? sale.change) ? (
            <p>Change: {formatCurrency(sale.changeGiven ?? sale.change ?? 0)}</p>
          ) : null}
          {sale.discount ? (
            <p className="font-normal text-[10px]">Discount: -{formatCurrency(sale.discount)}</p>
          ) : null}
          {sale.tax ? (
            <p className="font-normal text-[10px]">Tax: {formatCurrency(sale.tax)}</p>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <div className={`mt-4 pt-2 text-black ${!isMinimal ? `border-t ${isThermal ? "border-dashed" : "border-solid"} border-black` : ""}`}>
        {!isCompact && settings?.receiptReturnPolicy && (
          <p className="text-[10px] mb-2">{settings.receiptReturnPolicy}</p>
        )}
        {footerText && (
          <p className="text-center text-[11px] font-semibold">{footerText}</p>
        )}
        {(showBarcode || settings?.showQRCode) && !isCompact && (
          <div className="flex flex-col items-center mt-3 barcode-container">
            <div className="w-48 h-12 bg-white border-2 border-black flex items-center justify-center mb-1 p-2">
              <div className="flex gap-px">
                {[2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 1, 2, 3, 1].map((width, i) => (
                  <div
                    key={i}
                    className="bg-black"
                    style={{
                      width: `${width}px`,
                      height: '100%',
                    }}
                  />
                ))}
              </div>
            </div>
            {barcodeNumber && <p className="text-black text-[9px] font-mono mt-1">{barcodeNumber}</p>}
          </div>
        )}
      </div>
    </div>
  );
});

export default ReceiptTemplate;