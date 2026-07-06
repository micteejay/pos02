import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast as sonnerToast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./hooks/use-theme";
import { AppSettingsProvider } from "./hooks/use-app-settings";
import { AppEventsProvider } from "./hooks/use-app-events";
import { SharedDataProvider } from "./hooks/use-shared-data";
import { PermissionApprovalsProvider } from "./hooks/use-permission-approvals";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import CommandPalette from "./components/CommandPalette";
import AIChatAssistant from "./components/AIChatAssistant";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingFallback from "./components/LoadingFallback";
import PermissionGuard from "./components/PermissionGuard";
import type { Permission } from "./hooks/use-app-settings";

import { isTauri } from "@tauri-apps/api/core";
import { UpdateProvider } from "./hooks/use-updater";

// Lazy-loaded pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const WorkflowsPage = lazy(() => import("./pages/WorkflowsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const POSPage = lazy(() => import("./pages/POSPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SupplyPage = lazy(() => import("./pages/SupplyPage"));
const ApprovalsPage = lazy(() => import("./pages/ApprovalsPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const OrganizationPage = lazy(() => import("./pages/OrganizationPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const CompanySetupPage = lazy(() => import("./pages/CompanySetupPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SuperAdminPage = lazy(() => import("./pages/SuperAdminPage"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const ConnectPage = lazy(() => import("./pages/ConnectPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasCompanyProfile } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (!hasCompanyProfile) return <Navigate to="/setup-company" replace />;
  return <>{children}</>;
}

const PLATFORM_SUPER_ADMIN_EMAILS = ["babajuwon0@gmail.com", "bsbsjuwon0@gmail.com"];
function isPlatformOwner(email?: string | null) {
  return !!email && PLATFORM_SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasCompanyProfile, user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  // Honor ?next=<same-origin path> so OAuth consent (and similar deep links)
  // send the user back to where they came from after sign-in.
  const nextParam = new URLSearchParams(location.search).get("next");
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  if (isAuthenticated) {
    if (safeNext) return <Navigate to={safeNext} replace />;
    if (isPlatformOwner(user?.email)) return <Navigate to="/super-admin" replace />;
    if (from && from.startsWith("/super-admin")) return <Navigate to={from} replace />;
    return <Navigate to={hasCompanyProfile ? (from || "/") : "/setup-company"} replace />;
  }
  return <>{children}</>;
}

function SetupRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasCompanyProfile, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isPlatformOwner(user?.email)) return <Navigate to="/super-admin" replace />;
  if (hasCompanyProfile) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// /super-admin is intentionally public at the route level.
// The page itself performs a server-side authorization check via the
// super-admin edge function and shows an inline sign-in for anonymous
// visitors, so no auth redirect is needed here.
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Guarded({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PermissionGuard permission={permission}>{children}</PermissionGuard>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="/setup-company" element={<SetupRoute><CompanySetupPage /></SetupRoute>} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="/" element={<Guarded permission="pages.dashboard"><Index /></Guarded>} />
        <Route path="/chat" element={<Guarded permission="pages.chat"><ChatPage /></Guarded>} />
        <Route path="/documents" element={<Guarded permission="pages.documents"><DocumentsPage /></Guarded>} />
        <Route path="/workflows" element={<Guarded permission="pages.workflows"><WorkflowsPage /></Guarded>} />
        <Route path="/users" element={<Guarded permission="pages.users"><UsersPage /></Guarded>} />
        <Route path="/notifications" element={<Guarded permission="pages.notifications"><NotificationsPage /></Guarded>} />
        <Route path="/inventory" element={<Guarded permission="pages.inventory"><InventoryPage /></Guarded>} />
        <Route path="/sales" element={<Guarded permission="pages.sales"><SalesPage /></Guarded>} />
        <Route path="/pos" element={<Guarded permission="pages.pos"><POSPage /></Guarded>} />
        <Route path="/reports" element={<Guarded permission="pages.reports"><ReportsPage /></Guarded>} />
        <Route path="/supply" element={<Guarded permission="pages.supply"><SupplyPage /></Guarded>} />
        <Route path="/approvals" element={<Guarded permission="pages.approvals"><ApprovalsPage /></Guarded>} />
        <Route path="/organization" element={<Guarded permission="pages.organization"><OrganizationPage /></Guarded>} />
        <Route path="/audit" element={<Guarded permission="pages.audit"><AuditLogPage /></Guarded>} />
        <Route path="/settings" element={<Guarded permission="pages.settings"><SettingsPage /></Guarded>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/invoices" element={<Guarded permission="pages.documents"><InvoicePage /></Guarded>} />
        <Route path="/customers" element={<Guarded permission="pages.sales"><CustomersPage /></Guarded>} />
        <Route path="/connect" element={<ProtectedRoute><ConnectPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => {

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppSettingsProvider>
              <AppEventsProvider>
                <SharedDataProvider>
                  <UpdateProvider>
                    <PermissionApprovalsProvider>
                    <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <CommandPalette />
                      <AppRoutes />
                      <AIChatAssistant />
                    </BrowserRouter>
                    </TooltipProvider>
                    </PermissionApprovalsProvider>
                  </UpdateProvider>
                </SharedDataProvider>
              </AppEventsProvider>
            </AppSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
