import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  FileText, Upload, Search, Eye, Download, Folder, File, Image, FileSpreadsheet,
  Plus, FolderPlus, ChevronRight, MoreVertical, Trash2, X, Grid, List, ArrowUp, ArrowDown, Loader2, ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewErrorState } from "@/components/PreviewSkeleton";
import EmptyState from "@/components/EmptyState";

interface DocRecord {
  id: string; name: string; type: string; size: string; modified: string;
  author: string; authorName: string; folder: string; source?: string;
  storagePath?: string; storageBucket?: string;
}

const iconMap: Record<string, React.ElementType> = {
  pdf: FileText, xlsx: FileSpreadsheet, docx: File, png: Image, jpg: Image, folder: Folder, txt: File, csv: FileSpreadsheet, zip: File,
};
const colorMap: Record<string, string> = {
  pdf: "text-destructive", xlsx: "text-success", docx: "text-info", png: "text-accent", jpg: "text-accent", folder: "text-warning", txt: "text-muted-foreground", csv: "text-success", zip: "text-muted-foreground",
};

type SortKey = "name" | "modified" | "size";
type ViewMode = "list" | "grid";

const extToType = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["xlsx", "xls"].includes(ext)) return "xlsx";
  if (["docx", "doc"].includes(ext)) return "docx";
  if (["png"].includes(ext)) return "png";
  if (["jpg", "jpeg"].includes(ext)) return "jpg";
  if (["csv"].includes(ext)) return "csv";
  if (["zip"].includes(ext)) return "zip";
  return "txt";
};

const isImageType = (type: string) => ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(type.toLowerCase());
const isPdfType = (type: string) => type.toLowerCase() === "pdf";

function DocumentPreviewModal({ doc, onClose, onDownload, onDelete }: {
  doc: DocRecord;
  onClose: () => void;
  onDownload: (d: DocRecord) => void;
  onDelete: (d: DocRecord) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const loadPreview = useCallback(() => {
    if (!doc.storagePath || !doc.storageBucket) return;
    if (!isImageType(doc.type) && !isPdfType(doc.type)) return;
    setLoadingPreview(true);
    setPreviewError(null);
    setImgFailed(false);
    supabase.storage.from(doc.storageBucket).createSignedUrl(doc.storagePath, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) setPreviewError(error?.message || "Could not generate preview link.");
        else setPreviewUrl(data.signedUrl);
        setLoadingPreview(false);
      })
      .catch((e) => {
        setPreviewError(e?.message || "Preview failed");
        setLoadingPreview(false);
      });
  }, [doc.storagePath, doc.storageBucket, doc.type]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const Icon = iconMap[doc.type] || File;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl max-w-2xl w-full animate-fade-in max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">File Preview</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
          </div>

        {/* Preview Area */}
        <div className="w-full rounded-xl bg-muted/50 flex items-center justify-center mb-4 overflow-hidden">
          {loadingPreview ? (
            <div className="w-full p-4 space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : previewError ? (
            <PreviewErrorState variant="error" description={previewError} onRetry={loadPreview} />
          ) : isImageType(doc.type) && previewUrl && !imgFailed ? (
            <img
              src={previewUrl}
              alt={doc.name}
              className="max-w-full max-h-[50vh] object-contain"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : isImageType(doc.type) && imgFailed ? (
            <PreviewErrorState variant="image" />
          ) : isPdfType(doc.type) && previewUrl ? (
            <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-[50vh]" title={doc.name} />
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <Icon className={`w-16 h-16 ${colorMap[doc.type]}`} />
              <p className="text-xs text-muted-foreground">Inline preview not supported — download to view.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground truncate ml-2">{doc.name}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Size</span><span className="text-foreground">{doc.size}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Modified</span><span className="text-foreground">{doc.modified}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Author</span><span className="text-foreground">{doc.authorName}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><span className="text-foreground uppercase">{doc.type}</span></div>
          {doc.source && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Source</span><span className="text-info">{doc.source}</span></div>}
        </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-border bg-card/80 backdrop-blur-md shrink-0">
          <button onClick={() => onDownload(doc)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Download className="w-4 h-4" /> Download
          </button>
          {isPdfType(doc.type) && previewUrl && (
            <button onClick={() => window.open(previewUrl, "_blank")} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
              <Eye className="w-4 h-4" /> Open Full
            </button>
          )}
          <button onClick={() => { onDelete(doc); onClose(); }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentFolder, setCurrentFolder] = useState("/");
  const [sortKey, setSortKey] = useState<SortKey>("modified");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [previewDoc, setPreviewDoc] = useState<DocRecord | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents from DB
  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    if (data && !error) {
      // Fetch author names
      const authorIds = [...new Set(data.filter(d => d.author).map(d => d.author!))];
      let profileMap = new Map<string, string>();
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", authorIds);
        if (profiles) profileMap = new Map(profiles.map(p => [p.id, p.name || "Unknown"]));
      }

      setDocuments(data.map(d => ({
        id: d.id, name: d.name, type: d.type, size: d.size_display || "0 KB",
        modified: new Date(d.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        author: d.author || "", authorName: d.author ? (profileMap.get(d.author) || "Unknown") : "System",
        folder: d.folder_path || "/", source: d.source || undefined,
        storagePath: d.storage_path || undefined, storageBucket: d.storage_bucket || undefined,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const breadcrumbs = currentFolder === "/" ? ["/"] : ["/", ...currentFolder.split("/").filter(Boolean)];

  // Derive virtual folders from document folder_paths
  const virtualFolders = useMemo(() => {
    const folderSet = new Set<string>();
    const explicitFolders = new Set(
      documents.filter(d => d.type === "folder" && d.folder === currentFolder).map(d => d.name)
    );

    documents.forEach((d) => {
      const p = d.folder;
      if (p && p !== "/" && p !== currentFolder) {
        // If the doc's folder starts with currentFolder, extract the next subfolder
        const prefix = currentFolder === "/" ? "/" : currentFolder + "/";
        if (p === prefix.slice(0, -1) || p.startsWith(prefix)) {
          const rest = p.slice(prefix.length);
          const nextFolder = rest.split("/")[0];
          if (nextFolder && !explicitFolders.has(nextFolder)) folderSet.add(nextFolder);
        } else if (currentFolder === "/" && p.startsWith("/")) {
          const nextFolder = p.slice(1).split("/")[0];
          if (nextFolder && !explicitFolders.has(nextFolder)) folderSet.add(nextFolder);
        }
      }
    });
    return [...folderSet];
  }, [documents, currentFolder]);

  const currentDocs = useMemo(() => {
    let filtered = documents.filter((d) => d.folder === currentFolder);
    if (search) filtered = filtered.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
    filtered.sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "modified") cmp = a.modified.localeCompare(b.modified);
      else cmp = a.size.localeCompare(b.size);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered;
  }, [documents, currentFolder, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleFolderClick = (folderName: string) => {
    const path = currentFolder === "/" ? `/${folderName}` : `${currentFolder}/${folderName}`;
    setCurrentFolder(path);
    setSearch("");
  };

  const navigateBreadcrumb = (index: number) => {
    if (index === 0) setCurrentFolder("/");
    else setCurrentFolder("/" + breadcrumbs.slice(1, index + 1).join("/"));
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    const folderPath = currentFolder;
    const { data, error } = await supabase.from("documents").insert({
      name: newFolderName.trim(), type: "folder" as any,
      size_display: "0 items", folder_path: folderPath,
      author: user.id, source: null,
      company_id: user.companyId || null,
    }).select().single();

    if (error) {
      console.error("Failed to create folder document:", error);
    }

    if (data && !error) {
      // Also create in document_folders table
      await supabase.from("document_folders").insert({
        name: newFolderName.trim(), path: folderPath === "/" ? `/${newFolderName.trim()}` : `${folderPath}/${newFolderName.trim()}`,
        created_by: user.id,
        company_id: user.companyId || null,
      });
      setDocuments(prev => [{
        id: data.id, name: data.name, type: "folder", size: "0 items",
        modified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        author: user.id, authorName: user.name, folder: folderPath,
      }, ...prev]);
      toast.success(`Folder "${newFolderName.trim()}" created`);
    } else {
      toast.error("Failed to create folder");
    }
    setNewFolderName(""); setShowNewFolder(false);
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const sizeStr = file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;
      const ext = extToType(file.name);
      const storagePath = `${user.id}/${Date.now()}-${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      // Create DB record
      const { data, error } = await supabase.from("documents").insert({
        name: file.name, type: ext as any,
        size_display: sizeStr, size_bytes: file.size,
        mime_type: file.type, folder_path: currentFolder,
        author: user.id, storage_path: storagePath,
        storage_bucket: "documents", source: "Upload",
        company_id: user.companyId || null,
      }).select().single();

      if (error) {
        console.error("Failed to insert document record:", error);
        toast.error(`Database error for ${file.name}: ${error.message}`);
      }

      if (data && !error) {
        setDocuments(prev => [{
          id: data.id, name: file.name, type: ext, size: sizeStr,
          modified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          author: user.id, authorName: user.name, folder: currentFolder,
          source: "Upload", storagePath, storageBucket: "documents",
        }, ...prev]);
        toast.success(`Uploaded ${file.name}`);
      }
    }
    setUploading(false); setDragOver(false);
  }, [currentFolder, user]);

  const deleteDocument = useCallback(async (doc: DocRecord) => {
    // Delete from storage if applicable
    if (doc.storagePath && doc.storageBucket) {
      await supabase.storage.from(doc.storageBucket).remove([doc.storagePath]);
    }
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    toast.success(`Deleted ${doc.name}`);
  }, []);

  const downloadDocument = useCallback(async (doc: DocRecord) => {
    if (!doc.storagePath || !doc.storageBucket) {
      toast.error("No file available for download");
      return;
    }
    const { data, error } = await supabase.storage.from(doc.storageBucket).download(doc.storagePath);
    if (data && !error) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = doc.name; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      toast.error("Download failed");
    }
  }, []);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null;

  const totalFiles = documents.filter((d) => d.type !== "folder").length;
  const allFolderPaths = new Set(documents.map(d => d.folder).filter(f => f && f !== "/"));
  const totalFolders = allFolderPaths.size + documents.filter((d) => d.type === "folder").length;
  const stats = [
    { label: "Total Files", value: totalFiles },
    { label: "Folders", value: totalFolders },
    { label: "Total Items", value: documents.length },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 animate-fade-in">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div 
        className="relative space-y-6 animate-fade-in min-h-[600px] flex flex-col"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and share organizational files</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <FolderPlus className="w-4 h-4" /><span className="hidden sm:inline">New Folder</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 text-center hover:stat-glow transition-all duration-300">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 text-sm bg-muted/40 p-1.5 rounded-xl w-fit overflow-x-auto max-w-full">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
              <button onClick={() => navigateBreadcrumb(i)} className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${i === breadcrumbs.length - 1 ? "bg-background text-primary font-semibold shadow-sm" : "text-muted-foreground font-medium hover:text-foreground hover:bg-background/50"}`}>
                <Folder className={`w-3.5 h-3.5 ${i === breadcrumbs.length - 1 ? "fill-primary/20" : ""}`} />
                {crumb === "/" ? "Home" : crumb}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-card shadow-sm" : ""}`}><List className="w-4 h-4 text-foreground" /></button>
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-card shadow-sm" : ""}`}><Grid className="w-4 h-4 text-foreground" /></button>
          </div>
        </div>

        {dragOver && (
          <div
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 border-2 border-primary border-dashed rounded-xl m-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center cursor-pointer p-10 glass-card rounded-2xl w-full max-w-md shadow-2xl scale-105 transition-all">
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary text-primary-foreground shadow-lg animate-bounce">
                <Upload className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Drop files to upload</h3>
              <p className="text-sm text-muted-foreground">PDF, DOCX, XLSX, PNG, JPG up to 50MB</p>
              <p className="text-xs font-medium text-primary mt-4">or click to browse files</p>
            </div>
          </div>
        )}

        {showNewFolder && (
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <FolderPlus className="w-5 h-5 text-warning" />
            <Input placeholder="Folder name..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createFolder()} className="flex-1" autoFocus />
            <button onClick={createFolder} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button>
            <button onClick={() => setShowNewFolder(false)} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="flex-1 flex flex-col relative">
          {viewMode === "list" ? (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>
                        <span className="flex items-center gap-1">Name <SortIcon k="name" /></span>
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 cursor-pointer hover:text-foreground hidden sm:table-cell" onClick={() => toggleSort("size")}>
                        <span className="flex items-center gap-1">Size <SortIcon k="size" /></span>
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 cursor-pointer hover:text-foreground hidden md:table-cell" onClick={() => toggleSort("modified")}>
                        <span className="flex items-center gap-1">Modified <SortIcon k="modified" /></span>
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Author</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Source</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {virtualFolders.map((folderName) => (
                      <tr key={`vf-${folderName}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => handleFolderClick(folderName)}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Folder className="w-4 h-4 text-warning" />
                            </div>
                            <span className="text-sm font-medium text-foreground truncate">{folderName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground hidden sm:table-cell">—</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">—</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground hidden lg:table-cell">—</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground hidden lg:table-cell">—</td>
                        <td className="px-5 py-3 text-right"></td>
                      </tr>
                    ))}
                    {currentDocs.map((doc) => {
                      const Icon = iconMap[doc.type] || File;
                      return (
                        <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer"
                          onClick={() => doc.type === "folder" ? handleFolderClick(doc.name) : setPreviewDoc(doc)}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Icon className={`w-4 h-4 ${colorMap[doc.type] || "text-primary"}`} />
                              </div>
                              <span className="text-sm font-medium text-foreground truncate">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-muted-foreground hidden sm:table-cell">{doc.size}</td>
                          <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">{doc.modified}</td>
                          <td className="px-5 py-3 text-sm text-muted-foreground hidden lg:table-cell">{doc.authorName}</td>
                          <td className="px-5 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                            {doc.source && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info/10 text-info">{doc.source}</span>}
                          </td>
                          <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {doc.type !== "folder" && (
                                <>
                                  <button onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded-md hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                                  <button onClick={() => downloadDocument(doc)} className="p-1.5 rounded-md hover:bg-muted"><Download className="w-3.5 h-3.5 text-muted-foreground" /></button>
                                </>
                              )}
                              <button onClick={() => deleteDocument(doc)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {currentDocs.length === 0 && virtualFolders.length === 0 && (
                      <tr><td colSpan={6} className="p-0 border-none">
                        <div className="py-16">
                          <EmptyState 
                            icon={Folder} 
                            title={search ? "No files found" : "Folder is empty"} 
                            description={search ? "Try adjusting your search terms." : "Upload files or create folders to get started."}
                          />
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {virtualFolders.map((folderName) => (
                <div key={`vf-${folderName}`} className="glass-card rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => handleFolderClick(folderName)}>
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Folder className="w-6 h-6 text-warning" />
                  </div>
                  <p className="text-xs font-medium text-foreground text-center truncate">{folderName}</p>
                  <p className="text-[10px] text-muted-foreground text-center mt-0.5">Folder</p>
                </div>
              ))}
              {currentDocs.map((doc) => {
                const Icon = iconMap[doc.type] || File;
                return (
                  <div key={doc.id} className="glass-card rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors group"
                    onClick={() => doc.type === "folder" ? handleFolderClick(doc.name) : setPreviewDoc(doc)}>
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Icon className={`w-6 h-6 ${colorMap[doc.type] || "text-primary"}`} />
                    </div>
                    <p className="text-xs font-medium text-foreground text-center truncate">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground text-center mt-0.5">{doc.size}</p>
                    <div className="flex justify-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {doc.type !== "folder" && (
                        <button onClick={() => downloadDocument(doc)} className="p-1 rounded hover:bg-muted mr-1"><Download className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      )}
                      <button onClick={() => deleteDocument(doc)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </div>
                );
              })}
              {currentDocs.length === 0 && virtualFolders.length === 0 && (
                <div className="col-span-full py-16">
                  <EmptyState 
                    icon={Folder} 
                    title={search ? "No files found" : "Folder is empty"} 
                    description={search ? "Try adjusting your search terms." : "Upload files or create folders to get started."}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {previewDoc && (
          <DocumentPreviewModal
            doc={previewDoc}
            onClose={() => setPreviewDoc(null)}
            onDownload={downloadDocument}
            onDelete={deleteDocument}
          />
        )}
      </div>
    </AppLayout>
  );
}
