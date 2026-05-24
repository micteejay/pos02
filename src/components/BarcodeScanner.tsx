import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, SwitchCamera } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const containerId = "barcode-scanner-container";

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    let isStarting = true;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (mounted) {
            onScan(decodedText);
            try {
              if (scanner.isScanning) {
                scanner.stop().catch(() => {});
              }
            } catch {}
            onClose();
          }
        },
        () => {}
      )
      .then(() => {
        isStarting = false;
        if (!mounted) {
          try {
            if (scanner.isScanning) {
              scanner.stop().catch(() => {});
            }
          } catch {}
        }
      })
      .catch((err) => {
        isStarting = false;
        if (mounted) setError("Camera access denied or unavailable. Use manual entry below.");
      });

    return () => {
      mounted = false;
      try {
        if (scanner.isScanning) {
          scanner.stop().catch(() => {});
        }
      } catch {}
      scannerRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Scan Barcode</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div id={containerId} className="w-full rounded-lg overflow-hidden bg-muted min-h-[200px]" />

        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">Or enter barcode manually:</p>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter barcode number..."
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  onScan(manualCode.trim());
                  onClose();
                }
              }}
            />
            <button
              disabled={!manualCode.trim()}
              onClick={() => { onScan(manualCode.trim()); onClose(); }}
              className="px-4 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Go
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
