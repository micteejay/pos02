import AppLayout from "@/components/AppLayout";
import { FileText, Upload, Search, Filter, MoreHorizontal, Eye, Download, Folder, File, Image, FileSpreadsheet } from "lucide-react";

const documents = [
  { name: "Q4 Inventory Report.pdf", type: "pdf", size: "2.4 MB", modified: "Feb 12, 2026", author: "Sarah Chen", icon: FileText },
  { name: "Sales Forecast 2026.xlsx", type: "xlsx", size: "1.8 MB", modified: "Feb 11, 2026", author: "Mike Ross", icon: FileSpreadsheet },
  { name: "Employee Handbook v3.docx", type: "docx", size: "4.1 MB", modified: "Feb 10, 2026", author: "HR Department", icon: File },
  { name: "Warehouse Layout.png", type: "png", size: "890 KB", modified: "Feb 9, 2026", author: "Lisa Park", icon: Image },
  { name: "Purchase Orders - Jan.pdf", type: "pdf", size: "3.2 MB", modified: "Feb 8, 2026", author: "James Wilson", icon: FileText },
  { name: "Tax Filing Documents", type: "folder", size: "12 items", modified: "Feb 7, 2026", author: "Finance", icon: Folder },
];

export default function DocumentsPage() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and share organizational files</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input placeholder="Search documents..." className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Size</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Modified</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Author</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <doc.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{doc.size}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{doc.modified}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{doc.author}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><Download className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
