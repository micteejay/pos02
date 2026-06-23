import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Share2,
  Download,
  Printer,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { printNode, printHtmlString } from "@/lib/print";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

interface PrintEventDetail {
  node?: HTMLElement;
  html: string;
  title: string;
  opts?: {
    paperWidth?: string;
    bypassIntercept?: boolean;
  };
}

type ActionStatus =
  | "idle"
  | "rendering_image"
  | "rendering_pdf"
  | "sharing"
  | "saving"
  | "success"
  | "error";

export default function PrintActionsSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [eventData, setEventData] = useState<PrintEventDetail | null>(null);
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [savedFilePath, setSavedFilePath] = useState("");

  useEffect(() => {
    const handlePrintRequest = (e: Event) => {
      const customEvent = e as CustomEvent<PrintEventDetail>;
      if (customEvent.detail) {
        setEventData(customEvent.detail);
        setStatus("idle");
        setStatusMessage("");
        setSavedFilePath("");
        setIsOpen(true);
      }
    };

    window.addEventListener("app:show-print-sheet", handlePrintRequest);
    return () => {
      window.removeEventListener("app:show-print-sheet", handlePrintRequest);
    };
  }, []);

  if (!eventData) return null;

  const { node, html, title, opts } = eventData;
  const cleanTitle = title.replace(/[^a-zA-Z0-9_\-]/g, "_");

  // Helper to request filesystem permission on native platforms
  const checkAndRequestPermissions = async () => {
    try {
      const perm = await Filesystem.checkPermissions();
      if (perm.publicStorage !== "granted") {
        await Filesystem.requestPermissions();
      }
    } catch (e) {
      console.warn("Storage permission request failed:", e);
    }
  };

  // Helper to generate high-quality canvas from node or html string
  const getCanvas = async (): Promise<HTMLCanvasElement> => {
    if (node) {
      setStatus("rendering_image");
      setStatusMessage("Capturing document layout...");
      
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      
      const isThermal =
        title.toLowerCase().includes("receipt") ||
        title.toLowerCase().includes("txn") ||
        node.classList.contains("thermal-print") ||
        node.querySelector(".receipt-container") !== null;
        
      container.style.width = isThermal ? "380px" : "794px";
      container.style.background = "#ffffff";
      
      const clone = node.cloneNode(true) as HTMLElement;
      clone.style.display = "block";
      clone.style.width = "100%";
      
      container.appendChild(clone);
      document.body.appendChild(container);
      
      try {
        await new Promise((resolve) => setTimeout(resolve, 200));
        
        // Wait for images
        const images = container.querySelectorAll("img");
        await Promise.all(
          Array.from(images).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((res) => {
              img.onload = () => res(null);
              img.onerror = () => res(null);
            });
          })
        );

        const canvas = await html2canvas(clone, {
          scale: 2, // High DPI capture for crisp thermal/barcode rendering
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        
        return canvas;
      } finally {
        document.body.removeChild(container);
      }
    } else {
      setStatus("rendering_image");
      setStatusMessage("Compiling document preview...");
      
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      
      const isThermal =
        title.toLowerCase().includes("receipt") ||
        title.toLowerCase().includes("txn");
      container.style.width = isThermal ? "380px" : "794px";
      container.style.background = "#ffffff";
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      
      // Clone all stylesheets
      const styles = doc.querySelectorAll("style, link[rel='stylesheet']");
      styles.forEach((style) => {
        container.appendChild(style.cloneNode(true));
      });
      
      const contentWrapper = document.createElement("div");
      contentWrapper.innerHTML = doc.body.innerHTML;
      container.appendChild(contentWrapper);
      
      document.body.appendChild(container);
      
      try {
        await new Promise((resolve) => setTimeout(resolve, 250));
        
        const images = container.querySelectorAll("img");
        await Promise.all(
          Array.from(images).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((res) => {
              img.onload = () => res(null);
              img.onerror = () => res(null);
            });
          })
        );
        
        const canvas = await html2canvas(contentWrapper, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        
        return canvas;
      } finally {
        document.body.removeChild(container);
      }
    }
  };

  // Helper to generate jsPDF document from canvas
  const getPdf = (canvas: HTMLCanvasElement): jsPDF => {
    setStatus("rendering_pdf");
    setStatusMessage("Generating PDF document...");
    
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // 96 DPI: 1 px = 0.264583 mm. Divided by scale=2:
    const pxToMm = 0.264583 / 2;
    const widthMm = canvasWidth * pxToMm;
    const heightMm = canvasHeight * pxToMm;
    
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [widthMm, heightMm],
    });
    
    pdf.addImage(imgData, "JPEG", 0, 0, widthMm, heightMm);
    return pdf;
  };

  const handleShareImage = async () => {
    try {
      const canvas = await getCanvas();
      setStatus("sharing");
      setStatusMessage("Preparing image share sheet...");

      const base64Data = canvas.toDataURL("image/png").split(",")[1];
      const filename = `${cleanTitle}.png`;
      
      // Write to cache directory (automatically handled on Android/iOS, clean up on reboot)
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: `Share ${title}`,
        files: [writeResult.uri],
      });
      
      setStatus("success");
      setStatusMessage("Image shared successfully!");
      toast.success("Image shared successfully");
      setTimeout(() => setIsOpen(false), 1200);
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setStatusMessage(`Failed to share image: ${e.message || e}`);
      toast.error("Failed to share image");
    }
  };

  const handleSharePdf = async () => {
    try {
      const canvas = await getCanvas();
      const pdf = getPdf(canvas);
      setStatus("sharing");
      setStatusMessage("Preparing PDF share sheet...");

      const base64Data = pdf.output("datauristring").split(",")[1];
      const filename = `${cleanTitle}.pdf`;

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: `Share ${title} (PDF)`,
        files: [writeResult.uri],
      });

      setStatus("success");
      setStatusMessage("PDF shared successfully!");
      toast.success("PDF shared successfully");
      setTimeout(() => setIsOpen(false), 1200);
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setStatusMessage(`Failed to share PDF: ${e.message || e}`);
      toast.error("Failed to share PDF");
    }
  };

  const handleDownloadImage = async () => {
    try {
      await checkAndRequestPermissions();
      const canvas = await getCanvas();
      setStatus("saving");
      setStatusMessage("Saving image to device Documents...");

      const base64Data = canvas.toDataURL("image/png").split(",")[1];
      const filename = `${cleanTitle}_${Date.now()}.png`;

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });

      setSavedFilePath(writeResult.uri);
      setStatus("success");
      setStatusMessage("Image saved successfully!");
      toast.success("Saved to Documents folder");
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setStatusMessage(`Failed to save image: ${e.message || e}`);
      toast.error("Failed to save image");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await checkAndRequestPermissions();
      const canvas = await getCanvas();
      const pdf = getPdf(canvas);
      setStatus("saving");
      setStatusMessage("Saving PDF to device Documents...");

      const base64Data = pdf.output("datauristring").split(",")[1];
      const filename = `${cleanTitle}_${Date.now()}.pdf`;

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });

      setSavedFilePath(writeResult.uri);
      setStatus("success");
      setStatusMessage("PDF saved successfully!");
      toast.success("Saved to Documents folder");
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setStatusMessage(`Failed to save PDF: ${e.message || e}`);
      toast.error("Failed to save PDF");
    }
  };

  const handleDirectPrint = async () => {
    setIsOpen(false);
    // Call the bypassed print options to print directly
    if (node) {
      await printNode(node, title, { ...opts, bypassIntercept: true });
    } else {
      await printHtmlString(html, title, true);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent className="max-w-md mx-auto rounded-t-3xl border-border bg-card/95 backdrop-blur-xl pb-6">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Receipt Options
          </DrawerTitle>
          <DrawerDescription className="text-xs font-medium text-muted-foreground/80">
            {title}
          </DrawerDescription>
        </DrawerHeader>

        {status === "idle" ? (
          <div className="px-5 py-4 space-y-5">
            {/* Share Grid */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Share Receipt
              </h4>
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={handleSharePdf}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/40 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 group active:scale-95 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Share PDF
                  </span>
                </button>
                <button
                  onClick={handleShareImage}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/40 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 group active:scale-95 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform duration-300">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Share Image
                  </span>
                </button>
              </div>
            </div>

            {/* Download Grid */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Save to Device
              </h4>
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={handleDownloadPdf}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/40 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 group active:scale-95 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform duration-300">
                    <Download className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Save PDF
                  </span>
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/40 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 group active:scale-95 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform duration-300">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Save Image
                  </span>
                </button>
              </div>
            </div>

            {/* Print Section */}
            <div className="pt-2">
              <button
                onClick={handleDirectPrint}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:bg-primary/95 shadow-md shadow-primary/15 hover:shadow-lg active:scale-[0.98]"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
            </div>
          </div>
        ) : (
          <div className="p-10 flex flex-col items-center justify-center min-h-[220px] text-center animate-fade-in">
            {status === "rendering_image" ||
            status === "rendering_pdf" ||
            status === "sharing" ||
            status === "saving" ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-sm font-semibold text-foreground">{statusMessage}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Please wait a moment...</p>
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-success mb-4 animate-in zoom-in" />
                <p className="text-sm font-bold text-foreground">{statusMessage}</p>
                {savedFilePath && (
                  <p className="text-[10px] font-mono text-muted-foreground bg-muted/60 p-2.5 rounded-lg border border-border/40 mt-3 max-w-full truncate px-4">
                    {savedFilePath.replace(/^file:\/\//, "")}
                  </p>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="mt-6 px-6 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border/40 transition-colors"
                >
                  Dismiss
                </button>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-destructive mb-4 animate-in zoom-in" />
                <p className="text-sm font-semibold text-foreground">Action Failed</p>
                <p className="text-xs text-muted-foreground mt-2 px-6">{statusMessage}</p>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setStatus("idle")}
                    className="px-5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-5 py-2 bg-muted text-foreground text-xs font-bold rounded-lg hover:bg-muted/80 border border-border/40 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
