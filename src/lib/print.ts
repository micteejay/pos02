/**
 * Open the user's print dialog with the given HTML node, inheriting current
 * document styles (Tailwind tokens included) so receipts/invoices look
 * identical to the on-screen preview. Used by POS, Invoice, Sales reprint, PO.
 */
export function printNode(node: HTMLElement | null, title = "Print") {
  if (!node) return;
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    // Popup blocked — fall back to in-page print
    const fallback = window.document.createElement("div");
    fallback.id = "print-fallback";
    fallback.innerHTML = node.outerHTML;
    window.document.body.appendChild(fallback);
    window.print();
    window.document.body.removeChild(fallback);
    return;
  }

  // Copy all <style> and <link rel="stylesheet"> from the parent doc so
  // Tailwind utility classes & CSS variables resolve in the print window.
  const headStyles = Array.from(
    document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
      'link[rel="stylesheet"], style'
    )
  )
    .map((el) => el.outerHTML)
    .join("\n");

  // Snapshot CSS variables from :root so colors (hsl(var(--primary)) etc.)
  // render correctly even when the new window doesn't load index.css yet.
  const rootStyle = getComputedStyle(document.documentElement);
  const cssVars: string[] = [];
  // Read all custom properties exposed on :root
  for (let i = 0; i < rootStyle.length; i++) {
    const name = rootStyle.item(i);
    if (name.startsWith("--")) {
      cssVars.push(`${name}: ${rootStyle.getPropertyValue(name)};`);
    }
  }

  win.document.open();
  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${headStyles}
  <style>
    :root { ${cssVars.join(" ")} }
    html, body {
      margin: 0; padding: 16px;
      background: #fff !important; color: #000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>${node.outerHTML}</body>
</html>`);
  win.document.close();

  // Give the new window a tick to apply styles, then trigger print.
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error("Print failed", e);
    }
  };
  if (win.document.readyState === "complete") {
    setTimeout(trigger, 250);
  } else {
    win.addEventListener("load", () => setTimeout(trigger, 250));
  }
}