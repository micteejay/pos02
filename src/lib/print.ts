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
      margin: 0; padding: 12px;
      background: #fff !important; color: #000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
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
      await printHtml({ html, printer: selectedPrinter });
      return; // done — completely silent
    } catch (err) {
      console.error("[printNode] Native print failed, falling back to dialog:", err);
      // fall through to dialog fallback below
    }
  }

  // --- Path 2: In-page CSS print dialog (fallback) ---
  const originalTitle = document.title;
  document.title = title;
  document.body.classList.add("print-mode");

  const printContainer = node.cloneNode(true) as HTMLElement;
  printContainer.id = "print-container";
  document.body.appendChild(printContainer);

  try {
    window.print();
  } catch (e) {
    console.error("Print dialog failed", e);
  } finally {
    if (document.body.contains(printContainer)) {
      document.body.removeChild(printContainer);
    }
    document.body.classList.remove("print-mode");
    document.title = originalTitle;
  }
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
      await printHtml({ html, printer: selectedPrinter });
      return;
    } catch (err) {
      console.error("[printHtmlString] Native print failed, falling back to dialog:", err);
    }
  }

  // --- Path 2: In-page dialog fallback ---
  const originalTitle = document.title;
  document.title = title;
  document.body.classList.add("print-mode");

  const printContainer = document.createElement("div");
  printContainer.id = "print-container";
  printContainer.innerHTML = html;
  document.body.appendChild(printContainer);

  try {
    window.print();
  } catch (e) {
    console.error("Print dialog failed", e);
  } finally {
    if (document.body.contains(printContainer)) {
      document.body.removeChild(printContainer);
    }
    document.body.classList.remove("print-mode");
    document.title = originalTitle;
  }
}