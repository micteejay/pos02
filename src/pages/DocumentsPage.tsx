import { useState, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Upload,
  Search,
  Eye,
  Download,
  Folder,
  File,
  Image,
  FileSpreadsheet,
  Plus,
  FolderPlus,
  ChevronRight,
  MoreVertical,
  Trash2,
  X,
  Grid,
  List,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface DocItem {
  id: string;
  name: string;
  type: "pdf" | "xlsx" | "docx" | "png" | "jpg" | "folder" | "txt";
  size: string;
  modified: string;
  author: string;
  folder: string;
  preview?: string;
}

const iconMap: Record<string, React.ElementType> = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
  docx: File,
  png: Image,
  jpg: Image,
  folder: Folder,
  txt: File,
};

const colorMap: Record<string, string> = {
  pdf: "text-destructive",
  xlsx: "text-success",
  docx: "text-info",
  png: "text-accent",
  jpg: "text-accent",
  folder: "text-warning",
  txt: "text-muted-foreground",
};

const initialDocs: DocItem[] = [
  { id: "1", name: "Finance", type: "folder", size: "8 items", modified: "Feb 12, 2026", author: "System", folder: "/" },
  { id: "2", name: "HR Documents", type: "folder", size: "5 items", modified: "Feb 10, 2026", author: "System", folder: "/" },
  { id: "3", name: "Marketing Assets", type: "folder", size: "12 items", modified: "Feb 8, 2026", author: "System", folder: "/" },
  { id: "4", name: "Q4 Inventory Report.pdf", type: "pdf", size: "2.4 MB", modified: "Feb 12, 2026", author: "Sarah Chen", folder: "/" },
  { id: "5", name: "Sales Forecast 2026.xlsx", type: "xlsx", size: "1.8 MB", modified: "Feb 11, 2026", author: "Mike Ross", folder: "/" },
  { id: "6", name: "Employee Handbook v3.docx", type: "docx", size: "4.1 MB", modified: "Feb 10, 2026", author: "HR Department", folder: "/" },
  { id: "7", name: "Warehouse Layout.png", type: "png", size: "890 KB", modified: "Feb 9, 2026", author: "Lisa Park", folder: "/" },
  { id: "8", name: "Purchase Orders - Jan.pdf", type: "pdf", size: "3.2 MB", modified: "Feb 8, 2026", author: "James Wilson", folder: "/" },
  { id: "9", name: "Tax Filing 2025.pdf", type: "pdf", size: "5.1 MB", modified: "Jan 28, 2026", author: "Lisa Zhang", folder: "/Finance" },
  { id: "10", name: "Budget Overview.xlsx", type: "xlsx", size: "2.2 MB", modified: "Jan 25, 2026", author: "Lisa Zhang", folder: "/Finance" },
  { id: "11", name: "Invoice Template.docx", type: "docx", size: "340 KB", modified: "Jan 20, 2026", author: "Mark Davis", folder: "/Finance" },
  { id: "12", name: "Onboarding Checklist.docx", type: "docx", size: "520 KB", modified: "Feb 5, 2026", author: "Michael Brown", folder: "/HR Documents" },
  { id: "13", name: "Company Policy.pdf", type: "pdf", size: "1.9 MB", modified: "Feb 1, 2026", author: "HR Department", folder: "/HR Documents" },
  { id: "14", name: "Brand Guidelines.pdf", type: "pdf", size: "8.4 MB", modified: "Feb 7, 2026", author: "David Kumar", folder: "/Marketing Assets" },
  { id: "15", name: "Logo Pack.png", type: "png", size: "12 MB", modified: "Feb 6, 2026", author: "Design Team", folder: "/Marketing Assets" },
];

type SortKey = "name" | "modified" | "size";
type ViewMode = "list" | "grid";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>(initialDocs);
  const [search, setSearch] = useState("");
  const [currentFolder, setCurrentFolder] = useState("/");
  const [sortKey, setSortKey] = useState<SortKey>("modified");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const breadcrumbs = currentFolder === "/" ? ["/"] : ["/", ...currentFolder.split("/").filter(Boolean)];

  const currentDocs = useMemo(() => {
    let filtered = docs.filter((d) => d.folder === currentFolder);
    if (search) {
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
    }
    filtered.sort((a, b) => {
      // Folders first
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "modified") cmp = a.modified.localeCompare(b.modified);
      else cmp = a.size.localeCompare(b.size);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered;
  }, [docs, currentFolder, search, sortKey, sortDir]);

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
    else {
      const path = "/" + breadcrumbs.slice(1, index + 1).join("/");
      setCurrentFolder(path);
    }
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: DocItem = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      type: "folder",
      size: "0 items",
      modified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      author: "You",
      folder: currentFolder,
    };
    setDocs((prev) => [...prev, newFolder]);
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const handleUpload = useCallback(() => {
    // Simulate file upload
    const fakeFiles = [
      { name: `Upload_${Date.now()}.pdf`, type: "pdf" as const, size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB` },
    ];
    const newDocs: DocItem[] = fakeFiles.map((f) => ({
      id: Date.now().toString(),
      name: f.name,
      type: f.type,
      size: f.size,
      modified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      author: "You",
      folder: currentFolder,
    }));
    setDocs((prev) => [...prev, ...newDocs]);
    setShowUpload(false);
    setDragOver(false);
  }, [currentFolder]);

  const deleteDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (previewDoc?.id === id) setPreviewDoc(null);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null;

  const stats = [
    { label: "Total Files", value: docs.filter((d) => d.type !== "folder").length },
    { label: "Folders", value: docs.filter((d) => d.type === "folder").length },
    { label: "Storage Used", value: "42.8 MB" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and share organizational files</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New Folder</span>
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              <button
                onClick={() => navigateBreadcrumb(i)}
                className={`px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${
                  i === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {crumb === "/" ? "Root" : crumb}
              </button>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-card shadow-sm" : ""}`}>
              <List className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-card shadow-sm" : ""}`}>
              <Grid className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Drop zone overlay */}
        {(showUpload || dragOver) && (
          <div
            className="glass-card rounded-xl border-2 border-dashed border-primary/40 p-12 text-center cursor-pointer hover:border-primary transition-colors"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); handleUpload(); }}
            onClick={handleUpload}
          >
            <Upload className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, PNG, JPG up to 50MB</p>
            {showUpload && (
              <button onClick={(e) => { e.stopPropagation(); setShowUpload(false); }} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            )}
          </div>
        )}

        {/* New Folder Dialog */}
        {showNewFolder && (
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <FolderPlus className="w-5 h-5 text-warning" />
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              className="flex-1"
              autoFocus
            />
            <button onClick={createFolder} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button>
            <button onClick={() => setShowNewFolder(false)} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* File List */}
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
                    <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDocs.map((doc) => {
                    const Icon = iconMap[doc.type] || File;
                    return (
                      <tr
                        key={doc.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => doc.type === "folder" ? handleFolderClick(doc.name) : setPreviewDoc(doc)}
                      >
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
                        <td className="px-5 py-3 text-sm text-muted-foreground hidden lg:table-cell">{doc.author}</td>
                        <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.type !== "folder" && (
                              <>
                                <button onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded-md hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                                <button className="p-1.5 rounded-md hover:bg-muted"><Download className="w-3.5 h-3.5 text-muted-foreground" /></button>
                              </>
                            )}
                            <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {currentDocs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        {search ? "No files match your search." : "This folder is empty."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {currentDocs.map((doc) => {
              const Icon = iconMap[doc.type] || File;
              return (
                <div
                  key={doc.id}
                  className="glass-card rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => doc.type === "folder" ? handleFolderClick(doc.name) : setPreviewDoc(doc)}
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Icon className={`w-6 h-6 ${colorMap[doc.type] || "text-primary"}`} />
                  </div>
                  <p className="text-xs font-medium text-foreground text-center truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground text-center mt-0.5">{doc.size}</p>
                  <div className="flex justify-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => deleteDoc(doc.id)} className="p-1 rounded hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview Panel */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
            <div className="glass-card rounded-2xl p-6 max-w-lg w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">File Preview</h3>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="w-full aspect-video rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                {(() => { const Icon = iconMap[previewDoc.type] || File; return <Icon className={`w-16 h-16 ${colorMap[previewDoc.type]}`} />; })()}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{previewDoc.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Size</span><span className="text-foreground">{previewDoc.size}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Modified</span><span className="text-foreground">{previewDoc.modified}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Author</span><span className="text-foreground">{previewDoc.author}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><span className="text-foreground uppercase">{previewDoc.type}</span></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button onClick={() => deleteDoc(previewDoc.id)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
