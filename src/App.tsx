import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/use-theme";
import CommandPalette from "./components/CommandPalette";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import UsersPage from "./pages/UsersPage";
import NotificationsPage from "./pages/NotificationsPage";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalesPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import AuditLogPage from "./pages/AuditLogPage";
import OrganizationPage from "./pages/OrganizationPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CommandPalette />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/organization" element={<OrganizationPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
