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
  footer?: string,
  header?: string,
  width: number = 32
): string {
  let text = "";

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

  // Header
  text += center(company?.name || header || "Receipt") + "\n";
  if (company?.address) {
    const addressLine = [company.address, company.city].filter(Boolean).join(", ");
    text += center(addressLine) + "\n";
  }
  if (company?.phone) text += center(company.phone) + "\n";
  
  text += divider + "\n";
  text += line(`Receipt: ${sale.id}`, sale.date || "") + "\n";
  text += line("Customer:", sale.customer) + "\n";
  text += divider + "\n";

  // Items
  for (const item of sale.items) {
    const qtyStr = `x${item.qty}`;
    const left = `${item.name} ${qtyStr}`;
    const right = formatCurrency(item.price * item.qty);
    text += line(left, right) + "\n";
  }

  text += divider + "\n";
  if (sale.subtotal !== undefined) {
    text += line("Subtotal", formatCurrency(sale.subtotal)) + "\n";
  }
  if (sale.discount) {
    text += line("Discount", `-${formatCurrency(sale.discount)}`) + "\n";
  }
  if (sale.tax) {
    text += line("Tax", formatCurrency(sale.tax)) + "\n";
  }
  text += line("TOTAL", formatCurrency(sale.total)) + "\n";
  
  const methodLabel = sale.method === "card" ? "Credit Card" : sale.method === "cash" ? "Cash" : "Mobile Pay";
  text += line("Payment", methodLabel) + "\n";
  
  if (footer) {
    text += "\n" + center(footer) + "\n";
  }

  return text;
}
