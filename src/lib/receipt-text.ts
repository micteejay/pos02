import { ReceiptData, CompanyInfo } from "../components/ReceiptTemplate";

/**
 * Generates a clean, columnar monospace text receipt in the classic
 * "QTY  DESCRIPTION         PRICE      TOTAL" supermarket layout.
 *
 * Long descriptions wrap under the DESCRIPTION column so the PRICE / TOTAL
 * columns stay perfectly aligned regardless of how many items are printed.
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

  // Centered company header block matching the printed receipt template.
  text += center(headerText.toUpperCase()) + "\n";
  if (settings?.receiptTagline) {
    for (const w of wrap(`... ${settings.receiptTagline}`, width)) text += center(w) + "\n";
  }
  if (!isMinimal) {
    if (company?.address) {
      const addressLine = [company.address, company.city].filter(Boolean).join(", ");
      for (const w of wrap(addressLine, width)) text += center(w) + "\n";
    }
    if (company?.phone) text += center(company.phone) + "\n";
  }

  text += "\n";

  if (sale.cashier) text += `Sales Rep/Cashier: ${sale.cashier}\n`;
  if (sale.date) text += `Date: ${sale.date}\n`;
  text += `Customer: ${sale.customer}\n`;
  const methodLbl0 = sale.method === "card" ? "Credit Card" : sale.method === "cash" ? "Cash" : sale.method === "mobile" ? "Mobile Pay" : sale.method;
  text += `Payment Method: ${methodLbl0}\n\n`;
  text += center(`Receipt No: ${sale.id}`) + "\n";

  // Column widths — match the supermarket receipt layout: QTY | DESC | PRICE | TOTAL
  const qtyW = 3;
  const priceW = Math.max(8, Math.floor(width * 0.22));
  const totalW = Math.max(9, Math.floor(width * 0.24));
  const descW = Math.max(8, width - qtyW - priceW - totalW - 2); // 2 single-space gaps

  const padRight = (s: string, w: number) => (s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length));
  const padLeft = (s: string, w: number) => (s.length >= w ? s.slice(s.length - w) : " ".repeat(w - s.length) + s);

  const row = (qty: string, desc: string, price: string, total: string) =>
    padLeft(qty, qtyW) + " " + padRight(desc, descW) + " " + padLeft(price, priceW) + padLeft(total, totalW);

  // Items — paginated into sections of PAGE_SIZE so long receipts repeat
  // the column header and stay readable when many items are printed.
  const PAGE_SIZE = Number(settings?.receiptPageSize) || 25;
  const chunks: typeof sale.items[] = [];
  for (let i = 0; i < sale.items.length; i += PAGE_SIZE) {
    chunks.push(sale.items.slice(i, i + PAGE_SIZE));
  }
  if (chunks.length === 0) chunks.push([]);

  const emitHeader = () => {
    text += row("QTY", "DESCRIPTION", "PRICE", "TOTAL") + "\n";
    text += divider + "\n";
  };

  chunks.forEach((chunk, ci) => {
    if (ci > 0) {
      text += "\n";
      text += center(`-- continued (page ${ci + 1} of ${chunks.length}) --`) + "\n";
    }
    emitHeader();
    for (const item of chunk) {
      const priceStr = formatCurrency(item.price);
      const totalStr = formatCurrency(item.price * item.qty);
      const descLines = wrap(item.unitName ? `${item.name} (${item.unitName})` : item.name, descW);
      text += row(String(item.qty), descLines[0] ?? "", priceStr, totalStr) + "\n";
      for (let i = 1; i < descLines.length; i++) {
        text += row("", descLines[i], "", "") + "\n";
      }
    }
  });

  if (chunks.length > 1) {
    text += center(`-- end of items (${sale.items.length} total) --`) + "\n";
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
