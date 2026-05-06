import { Skeleton } from "@/components/ui/skeleton";
import { FileText, AlertTriangle, ImageOff } from "lucide-react";

/**
 * Skeleton placeholder mimicking the shape of an invoice/receipt page
 * (header band, party lines, items table, totals). Used while the
 * document data or signed URL is still loading.
 */
export function DocumentPreviewSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`glass-card rounded-xl ${compact ? "p-5" : "p-8"} space-y-5 animate-fade-in`}>
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
      <div className="border-t border-border/50 pt-4 flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2 items-end flex flex-col">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-full rounded-md" />
        {Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
      <div className="flex justify-end">
        <div className="w-48 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty/error state for a preview pane (no data, failed signed URL,
 * missing storage object, etc.).
 */
export function PreviewErrorState({
  variant = "empty",
  title,
  description,
  onRetry,
}: {
  variant?: "empty" | "error" | "image";
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const Icon = variant === "error" ? AlertTriangle : variant === "image" ? ImageOff : FileText;
  const defaultTitle =
    variant === "error"
      ? "Couldn't load preview"
      : variant === "image"
      ? "Image unavailable"
      : "Nothing to preview yet";
  const defaultDesc =
    variant === "error"
      ? "The file may have moved or your session expired. Try again or download instead."
      : variant === "image"
      ? "We couldn't render this image. You can still download it."
      : "Add items or details — a live preview will appear here.";
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-fade-in">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
          variant === "error" ? "bg-destructive/10" : "bg-muted/50"
        }`}
      >
        <Icon
          className={`w-7 h-7 ${
            variant === "error" ? "text-destructive" : "text-muted-foreground/40"
          }`}
        />
      </div>
      <p className="text-sm font-semibold text-foreground">{title || defaultTitle}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description || defaultDesc}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default DocumentPreviewSkeleton;