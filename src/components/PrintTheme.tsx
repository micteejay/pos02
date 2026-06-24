import { ReactNode, forwardRef } from "react";
import type { CompanyInfo } from "./ReceiptTemplate";

interface PrintThemeProps {
  /** Document type label shown in the top-right (e.g. "Invoice", "Purchase Order") */
  documentType: string;
  /** Document number/ID */
  documentNumber: string;
  /** Optional status pill (e.g. PO status) */
  statusLabel?: string;
  /** Company branding (name, address, phone, email) */
  company?: CompanyInfo | null;
  /** Optional logo URL */
  logoUrl?: string | null;
  /** Optional footer note (e.g. "Thanks for your business") */
  footer?: string;
  /** Body content (items table, totals, etc.) */
  children: ReactNode;
  /** App settings to obey print sizing */
  settings?: any;
}

/**
 * PrintTheme — shared document chrome for PO and Invoice printouts.
 *
 * Guarantees identical:
 *  - page margins (set in src/lib/print.ts via @page { margin: 8mm; })
 *  - typography (system sans, 12px body, 18px doc title)
 *  - header layout (logo/company on the left, doc type + number on the right)
 *  - footer (optional note + generated timestamp)
 */
const PrintTheme = forwardRef<HTMLDivElement, PrintThemeProps>(function PrintTheme(
  { documentType, documentNumber, statusLabel, company, logoUrl, footer, children, settings },
  ref,
) {
  const initial = (company?.name || documentType).charAt(0).toUpperCase();

  const paperWidth = "A4"; // Forced to A4 for Invoices/POs
  const isThermal = false;
  const sizeClasses = "max-w-[800px] p-8";

  const fontSizeClass =
    settings?.fontSize === "Small" ? "text-[8px]" :
    settings?.fontSize === "Large" ? "text-[12px]" : "text-[10px]";

  return (
    <div
      ref={ref}
      className={`bg-white text-black mx-auto print-doc ${isThermal ? sizeClasses + " " + fontSizeClass : "w-full"}`}
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: isThermal ? "inherit" : "12px",
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <header
        className="flex items-start justify-between"
        style={{
          paddingBottom: "12px",
          borderBottom: "2px solid black",
          marginBottom: "16px",
        }}
      >
        <div className="flex items-start" style={{ gap: "12px" }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: 56, height: 56, objectFit: "contain", border: "1px solid black", borderRadius: 6 }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                border: "1px solid black",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 22,
                color: "black",
              }}
            >
              {initial}
            </div>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "black" }}>
              {company?.name || documentType}
            </div>
            {company && (
              <div style={{ fontSize: 11, color: "black", marginTop: 2 }}>
                {[company.address, company.city].filter(Boolean).join(", ")}
              </div>
            )}
            {company?.phone && (
              <div style={{ fontSize: 11, color: "black" }}>{company.phone}</div>
            )}
            {company?.email && (
              <div style={{ fontSize: 11, color: "black" }}>{company.email}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "black" }}>
            {documentType}
          </div>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, marginTop: 2, color: "black" }}>
            # {documentNumber}
          </div>
          {statusLabel && (
            <div style={{ fontSize: 11, marginTop: 2, textTransform: "capitalize", color: "black" }}>
              {statusLabel}
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main>{children}</main>

      {/* Footer */}
      <footer
        style={{
          marginTop: "20px",
          paddingTop: "10px",
          borderTop: "1px solid black",
          fontSize: 10,
          display: "flex",
          justifyContent: "space-between",
          color: "black",
        }}
      >
        <span>{footer || ""}</span>
        <span>Printed {new Date().toLocaleString()}</span>
      </footer>
    </div>
  );
});

export default PrintTheme;