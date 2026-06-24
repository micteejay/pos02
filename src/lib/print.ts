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
import { Capacitor } from "@capacitor/core";

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
function nodeToHtml(node: HTMLElement, title: string, paperWidth?: string): string {
  // Translate user-facing paper width into a CSS page size
  const pageSize = (() => {
    const pw = (paperWidth || "").toLowerCase();
    if (pw.includes("58")) return "58mm auto";
    if (pw.includes("80")) return "80mm auto";
    if (pw.includes("a4")) return "A4";
    return "auto";
  })();
  const bodyMaxWidth = (() => {
    const pw = (paperWidth || "").toLowerCase();
    if (pw.includes("58")) return "58mm";
    if (pw.includes("80")) return "80mm";
    if (pw.includes("a4")) return "210mm";
    return "100%";
  })();

  const pw = (paperWidth || "").toLowerCase();
  const isThermal = pw.includes("58") || pw.includes("80");

  // Inline ALL stylesheets (resolved to absolute URLs) so Tailwind/utility
  // classes still apply inside the iframe/print window. Inline <style> blocks
  // are copied verbatim; <link rel="stylesheet"> is rewritten with an absolute
  // href so a sandboxed iframe (no base URL) can still fetch them.
  const base = document.baseURI || window.location.href;
  const styleLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
      'link[rel="stylesheet"], style'
    )
  )
    .map((el) => {
      if (el instanceof HTMLLinkElement && el.href) {
        const abs = new URL(el.getAttribute("href") || "", base).toString();
        return `<link rel="stylesheet" href="${abs}" />`;
      }
      return el.outerHTML;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <base href="${base}" />
  ${styleLinks}
  <style>
    /* Paper / page sizing — driven by Settings → Receipt → Paper Width */
    @page { size: ${pageSize}; margin: ${isThermal ? "2mm" : "12mm"}; }
    html, body { width: ${bodyMaxWidth} !important; max-width: ${bodyMaxWidth} !important; }
    .receipt-container { width: 100% !important; max-width: 100% !important; }
    /* Override all theme colors with black for printing */
    :root { 
      --background: 255 255 255;
      --foreground: 0 0 0;
      --card: 255 255 255;
      --card-foreground: 0 0 0;
      --primary: 0 0 0;
      --primary-foreground: 255 255 255;
      --border: 0 0 0;
    }
    
    html, body {
      margin: 0; padding: ${isThermal ? "4px" : "0"};
      width: 100%; max-width: 100%;
      background: #fff !important; color: #000 !important;
      ${isThermal ? 'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;' : ''}
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    
    ${isThermal ? `
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
    ` : ''}
    
    @media print { .no-print { display: none !important; } }

    /* ============================================================
     * Shared print document chrome — used by PrintTheme (PO + Invoice)
     * Single source of truth for page margins and outer spacing so
     * both templates render with identical geometry on every printer.
     * ============================================================ */
    ${!isThermal ? `
    @page { size: A4; margin: 12mm; }
    .print-doc {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 0 !important;        /* page margin handled by @page */
      background: #fff !important;
      color: #000 !important;
    }
    .print-doc header,
    .print-doc main,
    .print-doc footer { width: 100%; }
    .print-doc table { width: 100%; border-collapse: collapse; }
    .print-doc th, .print-doc td { padding: 4px 6px; vertical-align: top; }
    @media print {
      html, body { padding: 0 !important; }
      .print-doc { page-break-inside: auto; }
      .print-doc tr, .print-doc td { page-break-inside: avoid; }
    }
    ` : ''}
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
  title = "Print",
  opts?: { paperWidth?: string; bypassIntercept?: boolean }
): Promise<void> {
  if (!node) return;

  // Intercept on Capacitor Native Platform to show the Share/Download bottom sheet
  if (Capacitor.isNativePlatform() && !opts?.bypassIntercept) {
    window.dispatchEvent(
      new CustomEvent("app:show-print-sheet", {
        detail: {
          node,
          html: nodeToHtml(node, title, opts?.paperWidth),
          title,
          opts,
        },
      })
    );
    return;
  }

  const selectedPrinter = getSelectedPrinter();

  // --- Path 1: Silent native print via tauri-plugin-printer-v2 ---
  if (isTauri()) {
    try {
      const html = nodeToHtml(node, title, opts?.paperWidth);
      await printHtml({ 
        id: `pos-${Date.now()}`, 
        html, 
        printer: selectedPrinter || "default",
        remove_after_print: true 
      } as any);
      return; // done — completely silent
    } catch (err) {
      console.error("[printNode] Native print failed, falling back to dialog:", err);
      // fall through to dialog fallback below
    }
  }

  // --- Path 2: Fallback ---
  const html = nodeToHtml(node, title, opts?.paperWidth);
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
  title = "Print",
  bypassIntercept = false
): Promise<void> {
  // Intercept on Capacitor Native Platform to show the Share/Download bottom sheet
  if (Capacitor.isNativePlatform() && !bypassIntercept) {
    window.dispatchEvent(
      new CustomEvent("app:show-print-sheet", {
        detail: {
          html,
          title,
        },
      })
    );
    return;
  }

  const selectedPrinter = getSelectedPrinter();

  // --- Path 1: Silent native print ---
  if (isTauri()) {
    try {
      await printHtml({ 
        id: `pos-${Date.now()}`, 
        html, 
        printer: selectedPrinter || "default",
        remove_after_print: true 
      } as any);
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

  const cleanup = () => {
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 1500);
  };

  const triggerPrint = async () => {
    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      cleanup();
      window.print();
      return;
    }
    // Wait for all stylesheets/images inside the iframe to finish loading
    try {
      const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
      const imgs = Array.from(doc.images);
      await Promise.all([
        ...links.map(
          (l) =>
            new Promise<void>((res) => {
              if ((l as any).sheet) return res();
              l.addEventListener("load", () => res(), { once: true });
              l.addEventListener("error", () => res(), { once: true });
              setTimeout(() => res(), 1500);
            }),
        ),
        ...imgs.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  img.addEventListener("load", () => res(), { once: true });
                  img.addEventListener("error", () => res(), { once: true });
                  setTimeout(() => res(), 1500);
                }),
        ),
        (doc as any).fonts?.ready ?? Promise.resolve(),
      ]);
    } catch (e) {
      console.warn("[print] resource wait failed", e);
    }
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error("Print dialog failed", e);
    } finally {
      cleanup();
    }
  };

  iframe.addEventListener("load", () => {
    void triggerPrint();
  });

  // Use srcdoc so the iframe gets a proper document with <base> applied
  // before any resource resolution happens.
  iframe.srcdoc = html;
}