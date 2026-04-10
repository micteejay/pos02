import { useEffect, useRef, useCallback } from "react";

/**
 * Detects USB/Bluetooth barcode scanners by listening for rapid keystrokes.
 * Scanners typically type characters much faster than humans (~50ms between keys)
 * and end with an Enter key.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void, enabled = true) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const MAX_KEY_INTERVAL = 80; // ms between keystrokes (scanners are <50ms)
    const MIN_BARCODE_LENGTH = 4; // minimum chars to consider a barcode

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea (unless it's very fast input)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // If too much time passed, reset buffer
      if (timeSinceLastKey > MAX_KEY_INTERVAL) {
        bufferRef.current = "";
      }

      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= MIN_BARCODE_LENGTH) {
          e.preventDefault();
          e.stopPropagation();
          const barcode = bufferRef.current;
          bufferRef.current = "";
          onScanRef.current(barcode);
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // Only accept printable single characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // If this is rapid input (scanner-like) and we're in an input field,
        // prevent the character from being typed
        if (isInput && bufferRef.current.length >= 2 && timeSinceLastKey <= MAX_KEY_INTERVAL) {
          e.preventDefault();
          e.stopPropagation();
        }
        bufferRef.current += e.key;

        // Auto-clear buffer after a pause (in case Enter never comes)
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = "";
        }, 300);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled]);
}
