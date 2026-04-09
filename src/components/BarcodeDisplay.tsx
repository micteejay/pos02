import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function BarcodeDisplay({ value, width = 2, height = 50, className }: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          background: "transparent",
        });
      } catch {
        // If the value can't be encoded, just show text
      }
    }
  }, [value, width, height]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}
