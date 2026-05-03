/**
 * print.ts — Unified print helper for POS, Reports, Invoices, and POs.
 *
 * Strategy:
 *  1. If a printer is saved in localStorage (set via Settings → Hardware),
 *     use the native tauri-plugin-printer-v2 to send an HTML job directly
 *     to that printer — completely SILENT, no dialog.
 *  2. Otherwise, fall back to the CSS in-page print dialog (window.print).
 */
import { printHtml } from "tauri-plugin-printer-v2";

/** Check if we're running inside Tauri */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Get the currently selected printer name (saved by SettingsPage) */
function getSelectedPrinter(): string {
  try {
    return localStorage.getItem("pos_selected_printer") || "";
  } catch {
    return "";
  }
}

/**
 * Build a minimal standalone HTML string from a DOM node.
 * Captures computed CSS variables from :root so colors render correctly.
 */
function nodeToHtml(node: HTMLElement, title: string): string {
  const rootStyle = getComputedStyle(document.documentElement);
  const cssVars: string[] = [];
  for (let i = 0; i < rootStyle.length; i++) {
    const name = rootStyle.item(i);
    if (name.startsWith("--")) {
      cssVars.push(`${name}:${rootStyle.getPropertyValue(name)};`);
    }
  }

  // Copy all stylesheet links so Tailwind classes resolve
  const styleLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
      'link[rel="stylesheet"], style'
    )
  )
    .map((el) => el.outerHTML)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${styleLinks}
  <style>
    :root { ${cssVars.join(" ")} }
    html, body {
      margin: 0; padding: 4px;
      width: 100%; max-width: 100%;
      background: #fff !important; color: #000 !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    
    /* Thermal Printer Anti-Blur Optimizations */
    * {
      color: #000 !important; /* Force pure black to prevent dithering */
      border-color: #000 !important;
      background-color: transparent !important;
      -webkit-font-smoothing: none !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: geometricPrecision !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    
    /* Ensure lines print sharp */
    .border, .border-t, .border-b, .border-l, .border-r {
      border-style: solid !important;
      border-width: 1px !important;
    }
    .border-dashed {
      border-style: dashed !important;
    }
    
    /* Increase tiny text sizes for thermal clarity at 203 DPI */
    .text-\\[9px\\] { font-size: 11px !important; line-height: 1.2 !important; }
    .text-\\[10px\\] { font-size: 12px !important; line-height: 1.2 !important; }
    .text-xs { font-size: 13px !important; line-height: 1.3 !important; }
    .text-sm { font-size: 14px !important; line-height: 1.4 !important; }
    
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>${node.outerHTML}</body>
</html>`;
}

/**
 * Print a DOM node silently to the configured thermal printer,
 * or fall back to the OS print dialog if no printer is set.
 */
export async function printNode(
  node: HTMLElement | null,
  title = "Print"
): Promise<void> {
  if (!node) return;

  const selectedPrinter = getSelectedPrinter();

  // --- Path 1: Silent native print via tauri-plugin-printer-v2 ---
  if (isTauri() && selectedPrinter) {
    try {
      const html = nodeToHtml(node, title);
      await printHtml({ id: `pos-${Date.now()}`, html, printer: selectedPrinter } as any);
      return; // done — completely silent
    } catch (err) {
      console.error("[printNode] Native print failed, falling back to dialog:", err);
      // fall through to dialog fallback below
    }
  }

  // --- Path 2: Fallback ---
  const html = nodeToHtml(node, title);
  await printHtmlString(html, title);
}

/**
 * Print a raw text string, optimized for high-quality thermal printer output.
 * Bypasses complex HTML layouts and directly renders pure text in a sharp monospace font.
 */
export async function printText(
  text: string,
  title = "Print"
): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    html, body {
      margin: 0; padding: 0;
      width: 100%; max-width: 100%;
      background: #fff !important; color: #000 !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .receipt-text {
      margin: 0; padding: 4px;
      font-family: Consolas, "Lucida Console", Monaco, monospace !important;
      font-size: 13px !important;
      line-height: 1.2 !important;
      font-weight: normal !important;
      color: #000 !important;
      -webkit-font-smoothing: none !important;
    }
    @page {
      margin: 0;
      size: auto;
    }
  </style>
</head>
<body>
  <div class="receipt-text">
    ${text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;").replace(/\n/g, "<br/>")}
  </div>
</body>
</html>`;

  await printHtmlString(html, title);
}

/**
 * Print a raw HTML string directly to the configured printer (for Reports page).
 * Falls back to in-page dialog if no native printer is configured.
 */
export async function printHtmlString(
  html: string,
  title = "Print"
): Promise<void> {
  const selectedPrinter = getSelectedPrinter();

  // --- Path 1: Silent native print ---
  if (isTauri() && selectedPrinter) {
    try {
      await printHtml({ id: `pos-${Date.now()}`, html, printer: selectedPrinter } as any);
      return;
    } catch (err) {
      console.error("[printHtmlString] Native print failed, falling back to dialog:", err);
    }
  }

  // Using an iframe ensures the full HTML document (with <head> and <style>) is parsed properly
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "-10000px";
  iframe.style.width = "400px";
  iframe.style.height = "100vh";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for styles/images to load before printing
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Print dialog failed", e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000); // allow time for the print dialog to close on some browsers
      }
    }, 250);
  } else {
    // Ultimate fallback if iframe fails
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    window.print();
  }
}