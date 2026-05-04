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
  { documentType, documentNumber, statusLabel, company, logoUrl, footer, children },
  ref,
) {
  const initial = (company?.name || documentType).charAt(0).toUpperCase();
  return (
    <div
      ref={ref}
      className="bg-card text-foreground mx-auto print-doc"
      style={{
        maxWidth: "800px",
        padding: "16px 20px",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: "12px",
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <header
        className="flex items-start justify-between"
        style={{
          paddingBottom: "12px",
          borderBottom: "2px solid currentColor",
          marginBottom: "16px",
        }}
      >
        <div className="flex items-start" style={{ gap: "12px" }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: 56, height: 56, objectFit: "contain", border: "1px solid currentColor", borderRadius: 6 }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                border: "1px solid currentColor",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 22,
              }}
            >
              {initial}
            </div>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {company?.name || documentType}
            </div>
            {company && (
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                {[company.address, company.city].filter(Boolean).join(", ")}
              </div>
            )}
            {company?.phone && (
              <div style={{ fontSize: 11, opacity: 0.85 }}>{company.phone}</div>
            )}
            {company?.email && (
              <div style={{ fontSize: 11, opacity: 0.85 }}>{company.email}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {documentType}
          </div>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, marginTop: 2 }}>
            # {documentNumber}
          </div>
          {statusLabel && (
            <div style={{ fontSize: 11, marginTop: 2, textTransform: "capitalize", opacity: 0.85 }}>
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
          borderTop: "1px solid currentColor",
          fontSize: 10,
          display: "flex",
          justifyContent: "space-between",
          opacity: 0.85,
        }}
      >
        <span>{footer || ""}</span>
        <span>Printed {new Date().toLocaleString()}</span>
      </footer>
    </div>
  );
});

export default PrintTheme;