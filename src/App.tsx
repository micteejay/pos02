import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CommandPalette from "./components/CommandPalette";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import UsersPage from "./pages/UsersPage";
import NotificationsPage from "./pages/NotificationsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/inventory" element={<PlaceholderPage title="Inventory" description="Track stock levels, manage warehouses, and handle transfers across locations." />} />
          <Route path="/sales" element={<PlaceholderPage title="Sales" description="Monitor sales performance, process transactions, and manage POS operations." />} />
          <Route path="/approvals" element={<PlaceholderPage title="Approvals" description="Review and process pending approval requests across all workflows." />} />
          <Route path="/organization" element={<PlaceholderPage title="Organization" description="Manage stores, warehouses, departments, and organizational structure." />} />
          <Route path="/audit" element={<PlaceholderPage title="Audit Log" description="View tamper-proof logs of all system activities and changes." />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" description="Configure system preferences, integrations, and security settings." />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
