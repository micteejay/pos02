import { ReceiptData, CompanyInfo } from "../components/ReceiptTemplate";

/**
 * Generates a perfectly aligned monospace text receipt.
 * 
 * @param sale The receipt data
 * @param company The company profile
 * @param formatCurrency Currency formatting function
 * @param footer Optional footer text
 * @param header Optional header text
 * @param width The character width of the thermal printer (usually 32 for 58mm, 42 or 48 for 80mm)
 */
export function generateReceiptText(
  sale: ReceiptData,
  company: CompanyInfo | null | undefined,
  formatCurrency: (n: number) => string,
  settings?: any,
  overrideFooter?: string
): string {
  let text = "";

  const paperWidthStr = settings?.paperWidth || "80mm";
  const width = paperWidthStr.includes("80mm") ? 48 : paperWidthStr.includes("A4") ? 80 : 32;
  const isMinimal = settings?.receiptStyle === "minimal";
  const isCompact = settings?.receiptStyle === "compact";
  const isInvoice = settings?.receiptStyle === "invoice";

  const center = (str: string) => {
    if (str.length >= width) return str.substring(0, width);
    const pad = Math.floor((width - str.length) / 2);
    return " ".repeat(pad) + str + " ".repeat(width - str.length - pad);
  };

  const line = (left: string, right: string) => {
    if (left.length + right.length >= width) {
      // Truncate left side to make room for right side
      return left.substring(0, width - right.length - 1) + " " + right;
    }
    return left + " ".repeat(width - left.length - right.length) + right;
  };

  const divider = "-".repeat(width);
  const thickDivider = "=".repeat(width);

  const headerText = settings?.receiptHeader || company?.name || "Receipt";
  const footerText = overrideFooter || settings?.receiptFooter;

  if (isInvoice) {
    text += center("INVOICE") + "\n";
    text += center(headerText) + "\n";
  } else {
    text += center(headerText) + "\n";
  }

  if (!isMinimal) {
    if (company?.address) {
      const addressLine = [company.address, company.city].filter(Boolean).join(", ");
      text += center(addressLine) + "\n";
    }
    if (company?.phone) text += center(company.phone) + "\n";
  }

  if (!isCompact) text += "\n";
  text += isInvoice ? thickDivider + "\n" : divider + "\n";
  
  text += line(isInvoice ? `Invoice: ${sale.id}` : `Receipt: ${sale.id}`, sale.date || "") + "\n";
  text += line("Customer:", sale.customer) + "\n";
  text += isInvoice ? thickDivider + "\n" : divider + "\n";
  text += line("Item Name  Qty  Price", "Amount") + "\n";
  text += divider + "\n";

  // Items
  for (const item of sale.items) {
    const itemName = item.name.length > 20 ? item.name.substring(0, 20) + ".." : item.name;
    const qtyStr = `${item.qty} x ${formatCurrency(item.price)}`;
    const left = `${itemName}  ${qtyStr}`;
    const right = formatCurrency(item.price * item.qty);
    text += line(left, right) + "\n";
  }

  text += isInvoice ? thickDivider + "\n" : divider + "\n";
  if (sale.subtotal !== undefined) {
    text += line("Subtotal", formatCurrency(sale.subtotal)) + "\n";
  }
  if (sale.tax) {
    const taxRate = sale.subtotal ? ((sale.tax / sale.subtotal) * 100).toFixed(0) : "0";
    text += line(`Tax (${taxRate}%)`, formatCurrency(sale.tax)) + "\n";
  }
  if (sale.discount) {
    text += line("Discount", `-${formatCurrency(sale.discount)}`) + "\n";
  }
  
  text += isInvoice ? thickDivider + "\n" : divider + "\n";
  text += line(isInvoice ? "TOTAL DUE" : "TOTAL", formatCurrency(sale.total)) + "\n";
  
  const methodLabel = sale.method === "card" ? "Credit Card" : sale.method === "cash" ? "Cash" : sale.method === "mobile" ? "Mobile Pay" : sale.method;
  text += line("Payment Method", methodLabel) + "\n";
  
  if (sale.amountTendered !== undefined) {
    text += line("Amount Tendered", formatCurrency(sale.amountTendered)) + "\n";
  }
  if (sale.changeGiven !== undefined) {
    text += line("Change Given", formatCurrency(sale.changeGiven)) + "\n";
  }
  
  if (footerText) {
    if (!isCompact) text += "\n";
    text += center(footerText) + "\n";
  }
  
  if (settings?.receiptReturnPolicy && !isCompact) {
    text += center(settings.receiptReturnPolicy) + "\n";
  }

  return text;
}
