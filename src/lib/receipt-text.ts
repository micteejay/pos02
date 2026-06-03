import { ReceiptData, CompanyInfo } from "../components/ReceiptTemplate";

/**
 * Generates a clean, left-aligned monospace text receipt.
 *
 * Layout uses a two-line block per item so long product names never overflow
 * and amounts stay readable regardless of how many items are in the cart.
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
      // Wrap: put right on its own line, indented to align right
      const pad = Math.max(0, width - right.length);
      return left + "\n" + " ".repeat(pad) + right;
    }
    return left + " ".repeat(width - left.length - right.length) + right;
  };

  // Word-wrap a string to `w` columns, returning an array of lines.
  const wrap = (str: string, w: number, indent = ""): string[] => {
    const words = str.split(/\s+/);
    const out: string[] = [];
    let cur = "";
    for (const word of words) {
      const candidate = cur ? cur + " " + word : word;
      if (candidate.length <= w) {
        cur = candidate;
      } else {
        if (cur) out.push(cur);
        // very long word — hard split
        if (word.length > w) {
          let remaining = word;
          while (remaining.length > w) {
            out.push(remaining.slice(0, w));
            remaining = remaining.slice(w);
          }
          cur = remaining;
        } else {
          cur = word;
        }
      }
    }
    if (cur) out.push(cur);
    return out.map((l, i) => (i === 0 ? l : indent + l));
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
      for (const w of wrap(addressLine, width)) text += center(w) + "\n";
    }
    if (company?.phone) text += center(company.phone) + "\n";
  }

  if (!isCompact) text += "\n";
  text += isInvoice ? thickDivider + "\n" : divider + "\n";
  
  text += line(isInvoice ? `Invoice: ${sale.id}` : `Receipt: ${sale.id}`, sale.date || "") + "\n";
  text += `Customer: ${sale.customer}` + "\n";
  text += isInvoice ? thickDivider + "\n" : divider + "\n";
  text += "ITEMS" + "\n";
  text += divider + "\n";

  // Items — clean left-aligned two-line block per item, with totals on the right.
  for (const item of sale.items) {
    const lineTotal = formatCurrency(item.price * item.qty);
    // Name line: wrap to full width.
    for (const w of wrap(item.name, width)) text += w + "\n";
    // Detail line: "  3 x 1,500.00 / Box" left, total right.
    const detail = `  ${item.qty} x ${formatCurrency(item.price)}${item.unitName ? ` / ${item.unitName}` : ""}`;
    text += line(detail, lineTotal) + "\n";
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
  // Payments breakdown
  const payments: Array<{ method: string; amount: number; reference?: string }> = Array.isArray(sale.payments)
    ? sale.payments
    : [];
  if (payments.length > 0) {
    text += divider + "\n";
    for (const p of payments) {
      const lbl = p.method === "card" ? "Card" : p.method === "cash" ? "Cash" : p.method === "mobile" ? "Mobile" : p.method === "transfer" ? "Transfer" : p.method;
      text += line(lbl, formatCurrency(p.amount)) + "\n";
      if (p.reference) text += `  ref: ${p.reference}`.slice(0, width) + "\n";
    }
  } else {
    const methodLabel = sale.method === "card" ? "Credit Card" : sale.method === "cash" ? "Cash" : sale.method === "mobile" ? "Mobile Pay" : sale.method;
    text += line("Payment Method", methodLabel) + "\n";
  }
  const amountTendered = sale.amountTendered;
  const change = sale.changeGiven ?? sale.change;
  const balanceDue = sale.balanceDue;
  if (typeof amountTendered === "number" && amountTendered > 0) {
    text += line("Amount Tendered", formatCurrency(amountTendered)) + "\n";
  }
  if (typeof change === "number" && change > 0) {
    text += line("Change Given", formatCurrency(change)) + "\n";
  }
  if (typeof balanceDue === "number" && balanceDue > 0) {
    text += line("BALANCE DUE", formatCurrency(balanceDue)) + "\n";
  }
  if (footerText) {
    if (!isCompact) text += "\n";
    for (const w of wrap(footerText, width)) text += center(w) + "\n";
  }
  
  if (settings?.receiptReturnPolicy && !isCompact) {
    for (const w of wrap(settings.receiptReturnPolicy, width)) text += center(w) + "\n";
  }

  return text;
}
