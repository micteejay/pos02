import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Paperclip, Upload, X, Download, FileText, Image as ImageIcon,
  Loader2, Eye, Link as LinkIcon, File as FileIcon,
} from "lucide-react";
import { PreviewErrorState } from "@/components/PreviewSkeleton";
import EmptyState from "@/components/EmptyState";
import { Input } from "@/components/ui/input";

/**
 * A single attachment record stored on a parent row (invoice / sale).
 * `storagePath` lives in the private `documents` bucket; previews are
 * served via short-lived signed URLs.
 */
export interface Attachment {
  name: string;
  size: string;
  type: string;
  storagePath: string;
  storageBucket: string;
  documentId?: string | null;
  uploadedAt?: string;
}

export const isImageAttachment = (t: string) =>
  ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes((t || "").toLowerCase());
export const isPdfAttachment = (t: string) => (t || "").toLowerCase() === "pdf";

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() || "file";
const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Inline thumbnail/preview row for a single attachment. */
function AttachmentRow({
  att,
  onPreview,
  onRemove,
  readOnly,
}: {
  att: Attachment;
  onPreview: (att: Attachment) => void;
  onRemove?: () => void;
  readOnly?: boolean;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isImageAttachment(att.type)) return;
    setLoading(true);
    supabase.storage
      .from(att.storageBucket)
      .createSignedUrl(att.storagePath, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) setFailed(true);
        else setThumb(data.signedUrl);
        setLoading(false);
      })
      .catch(() => {
        setFailed(true);
        setLoading(false);
      });
  }, [att.storagePath, att.storageBucket, att.type]);

  const Icon = isPdfAttachment(att.type) ? FileText : isImageAttachment(att.type) ? ImageIcon : FileIcon;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/60">
      <div className="w-12 h-12 rounded-md bg-card border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0">
        {isImageAttachment(att.type) && thumb && !failed ? (
          <img
            src={thumb}
            alt={att.name}
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : loading ? (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Icon className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{att.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {att.type.toUpperCase()} · {att.size}
        </p>
      </div>
      <button
        onClick={() => onPreview(att)}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Preview"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>
      {!readOnly && onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/** Modal that renders a full preview for image / PDF / generic files. */
function AttachmentPreviewModal({ att, onClose }: { att: Attachment; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setUrl(null);
    supabase.storage
      .from(att.storageBucket)
      .createSignedUrl(att.storagePath, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) setError(error?.message || "Could not load file.");
        else setUrl(data.signedUrl);
      })
      .catch((e) => setError(e?.message || "Preview failed"));
  }, [att.storagePath, att.storageBucket]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async () => {
    const { data, error } = await supabase.storage.from(att.storageBucket).download(att.storagePath);
    if (error || !data) {
      toast.error("Download failed");
      return;
    }
    const blobUrl = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = att.name;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="text-sm font-medium text-foreground truncate">{att.name}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={download}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-lg bg-muted/20 flex items-center justify-center">
          {error ? (
            <PreviewErrorState variant="error" description={error} onRetry={load} />
          ) : !url ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : isImageAttachment(att.type) ? (
            <img
              src={url}
              alt={att.name}
              className="max-w-full max-h-[75vh] object-contain"
              onError={() => setError("Image could not be displayed.")}
            />
          ) : isPdfAttachment(att.type) ? (
            <iframe src={url} className="w-full h-[75vh]" title={att.name} />
          ) : (
            <PreviewErrorState
              title="No inline preview"
              description="This file type can't be previewed in the browser. Download it to view."
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal that lets the user pick from existing Documents to link as attachment. */
function DocumentPickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (att: Attachment) => void;
}) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("documents")
      .select("id, name, type, size_display, storage_path, storage_bucket")
      .eq("is_archived", false)
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setDocs(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = docs.filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl p-5 max-w-lg w-full max-h-[80vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Link a document</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search documents..."
          className="mb-3"
        />
        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Upload files in the Documents module first." />
          ) : (
            filtered.map((d) => (
              <button
                key={d.id}
                onClick={() =>
                  onPick({
                    name: d.name,
                    size: d.size_display || "",
                    type: d.type || extOf(d.name),
                    storagePath: d.storage_path,
                    storageBucket: d.storage_bucket || "documents",
                    documentId: d.id,
                    uploadedAt: new Date().toISOString(),
                  })
                }
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left"
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(d.type || "").toUpperCase()} · {d.size_display}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable attachments manager for invoice / sale modals.
 * Uploads files to the `documents` bucket scoped under `<scope>/<parentId>/`,
 * and renders inline previews + a full preview modal.
 */
export default function AttachmentsManager({
  attachments,
  onChange,
  scope,
  parentId,
  readOnly,
  compact,
}: {
  attachments: Attachment[];
  onChange?: (next: Attachment[]) => void;
  scope: "invoice" | "sale";
  parentId: string;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState<Attachment | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!onChange) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20 MB).");
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${scope}/${parentId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("documents").upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error("Upload failed: " + error.message);
      return;
    }
    const att: Attachment = {
      name: file.name,
      size: fmtSize(file.size),
      type: extOf(file.name),
      storagePath,
      storageBucket: "documents",
      uploadedAt: new Date().toISOString(),
    };
    onChange([...(attachments || []), att]);
    toast.success("Attachment added");
  };

  const handleRemove = (idx: number) => {
    if (!onChange) return;
    const next = attachments.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className={`space-y-2 ${compact ? "" : "glass-card rounded-xl p-4"}`}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" /> Attachments
            {attachments.length > 0 && (
              <span className="text-muted-foreground font-normal">({attachments.length})</span>
            )}
          </h3>
          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPicker(true)}
                className="text-[11px] px-2 py-1 rounded bg-muted text-foreground hover:bg-muted/70 inline-flex items-center gap-1"
                title="Link existing document"
              >
                <LinkIcon className="w-3 h-3" /> Link
              </button>
              <button
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}{" "}
                Upload
              </button>
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {attachments.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No attachments yet.</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((att, i) => (
            <AttachmentRow
              key={`${att.storagePath}-${i}`}
              att={att}
              onPreview={setPreviewing}
              onRemove={!readOnly ? () => handleRemove(i) : undefined}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
      {previewing && (
        <AttachmentPreviewModal att={previewing} onClose={() => setPreviewing(null)} />
      )}
      {showPicker && (
        <DocumentPickerModal
          onClose={() => setShowPicker(false)}
          onPick={(att) => {
            onChange?.([...(attachments || []), att]);
            setShowPicker(false);
            toast.success("Document linked");
          }}
        />
      )}
    </div>
  );
}