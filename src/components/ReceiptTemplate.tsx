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
  cashier?: string;
  workstation?: string;
  amountTendered?: number;
  changeGiven?: number;
  debitCardAmount?: number;
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
  { sale, company, formatCurrency, settings, overrideFooter, showBarcode, barcodeNumber },
  ref,
) {
  const style = settings?.receiptStyle || "classic";
  const isModern = style === "modern";
  const isClassic = style === "classic";
  const isMinimal = style === "minimal";
  const isBranded = style === "branded";
  const isCompact = style === "compact";
  const isThermal = style === "thermal";
  const isInvoice = style === "invoice";
  
  const receiptSize = settings?.receiptSize || 'medium';
  const sizeClasses = {
    small: 'max-w-[240px] p-3 text-[8px]',
    medium: 'max-w-[280px] p-4 text-[10px]',
    large: 'max-w-[320px] p-5 text-[12px]'
  }[receiptSize];
  
  const customColors = settings?.customColors || {};
  const primaryColor = customColors.primary || 'currentColor';
  const backgroundColor = customColors.background || 'bg-white';

  const fontSizeClass =
    settings?.fontSize === "Small" ? "text-[8px]" :
    settings?.fontSize === "Large" ? "text-[12px]" : "text-[10px]";

  const headerText = settings?.receiptHeader || company?.name || "Receipt";
  const footerText = overrideFooter || settings?.receiptFooter;

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
      className={`border-2 border-black bg-white font-mono ${fontSizeClass} leading-snug ${sizeClasses} mx-auto w-full receipt-container`}
    >
      {/* Header Section */}
      <div className="text-center mb-3">
        {company?.logoUrl && (
          <img 
            src={company.logoUrl} 
            alt="Company Logo" 
            className="mx-auto mb-2 h-12 w-auto object-contain max-w-full"
          />
        )}
        <p className="font-bold text-black text-lg mb-1 tracking-wide">{headerText}</p>
        {company && (
          <p className="text-black text-[9px] mb-0.5">
            {company.address}{company.city ? `, ${company.city}` : ""}
          </p>
        )}
        {company?.phone && <p className="text-black text-[9px]">Tel: {company.phone}</p>}
      </div>

      {/* Receipt Info */}
      <div className="border-t border-black mb-2" />
      <div className="flex justify-between text-black mb-1">
        <span className="text-[9px] font-semibold">Sales Receipt # {sale.id}</span>
        {sale.workstation && <span className="text-[9px]">Workstation: {sale.workstation}</span>}
      </div>
      <div className="text-black mb-2">
        <span className="text-[9px]">{sale.date}</span>
      </div>

      {/* Customer & Cashier */}
      <div className="border-t border-black mb-2" />
      <div className="space-y-1 mb-2">
        <div className="text-black">
          <span className="text-[9px] font-semibold">Bill To: {sale.customer}</span>
        </div>
        {sale.cashier && (
          <div className="text-black">
            <span className="text-[9px]">Cashier: {sale.cashier}</span>
          </div>
        )}
      </div>

      {/* Items Table Header */}
      <div className="border-t border-black mb-1" />
      <div className="flex justify-between text-[8px] text-black uppercase tracking-wider mb-1 font-bold">
        <span className="flex-1">Item Name</span>
        <span className="w-12 text-center">Qty</span>
        <span className="w-16 text-right">Price</span>
        <span className="w-16 text-right">Ext Price</span>
      </div>
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-black mb-1`} />
      
      {/* Items */}
      {sale.items.map((item, i) => {
        const factor = item.unitFactor || 1;
        return (
          <div key={item.lineKey || `${item.name}-${i}`} className="flex justify-between items-baseline text-black py-0.5">
            <div className="flex-1">
              <div className="text-[9px]">{item.name}</div>
            </div>
            <div className="w-12 text-center text-[9px] text-black">
              {item.qty}
            </div>
            <div className="w-16 text-right text-[9px] text-black">
              {formatCurrency(item.price)}
            </div>
            <div className="w-16 text-right text-[9px] font-semibold">
              {formatCurrency(item.price * item.qty)}
            </div>
          </div>
        );
      })}
      
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-black my-2`} />
      
      {/* Summary Section */}
      <div className="space-y-1">
        {sale.subtotal !== undefined && (
          <div className="flex justify-between text-black">
            <span className="text-[9px]">Subtotal</span>
            <span className="text-[9px]">{formatCurrency(sale.subtotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-black">
          <span className="text-[9px]">Local Sales Tax</span>
          <span className="text-[9px]">{sale.tax ? `${((sale.tax / sale.subtotal) * 100).toFixed(0)}% Tax ${formatCurrency(sale.tax)}` : "0% Tax N0.00"}</span>
        </div>
      </div>
      
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-black my-2`} />
      
      <div className="flex justify-between font-bold text-black text-sm pt-1">
        <span>RECEIPT TOTAL</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>

      {/* Payment Section */}
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-black my-2`} />
      <div className="space-y-1">
        {sale.amountTendered !== undefined && (
          <div className="flex justify-between text-black">
            <span className="text-[9px]">Amount Tendered</span>
            <span className="text-[9px]">{formatCurrency(sale.amountTendered)}</span>
          </div>
        )}
        {sale.changeGiven !== undefined && (
          <div className="flex justify-between text-black">
            <span className="text-[9px]">Change Given</span>
            <span className="text-[9px]">{formatCurrency(sale.changeGiven)}</span>
          </div>
        )}
        {sale.debitCardAmount !== undefined && (
          <div className="flex justify-between text-black">
            <span className="text-[9px]">Debit Card</span>
            <span className="text-[9px]">{formatCurrency(sale.debitCardAmount)}</span>
          </div>
        )}
        {sale.discount && (
          <div className="flex justify-between text-black">
            <span className="text-[9px]">Total Sales Discounts</span>
            <span className="text-[9px]">-{formatCurrency(sale.discount)}</span>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-black mt-3 pt-2 text-center`}>
        {footerText && <p className="text-black text-[9px] mb-2 font-semibold">{footerText}</p>}
        {showBarcode && (
          <div className="flex flex-col items-center mt-2 barcode-container">
            <div className="w-48 h-12 bg-white border-2 border-black flex items-center justify-center mb-1 p-2">
              <div className="flex gap-px">
                {[2,1,3,1,2,1,1,3,2,1,1,2,3,1,2,1,3,1,1,2,1,3,2,1,1,3,1,2,1,2,3,1,2,1,1,3,2,1,2,1,1,3,1,2,1,2,3,1].map((width, i) => (
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
      
      {settings?.receiptReturnPolicy && <p className="text-black text-[8px] mt-2">{settings.receiptReturnPolicy}</p>}
    </div>
  );
});

export default ReceiptTemplate;