import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DensityProvider } from "@/contexts/DensityContext";
import { lazy, Suspense } from "react";
import { PageLoadingFallback } from "@/components/loading/PageLoadingFallback";
import { HelmetProvider } from "react-helmet-async";
import { KeyboardShortcutsProvider } from "@/components/shared/KeyboardShortcutsProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { BottomNavigation } from "@/components/mobile/BottomNavigation";

// Eager loading for public pages and auth
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import KnowledgeBasePublic from "./pages/public/KnowledgeBasePublic";
import ClientRegistration from "./pages/public/ClientRegistration";
import ProjectApproval from "./pages/public/ProjectApproval";
import ApprovalSuccess from "./pages/public/ApprovalSuccess";
import Install from "./pages/Install";
import PublicTicket from "./pages/public/PublicTicket";

// Lazy loading for main application pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Tickets = lazy(() => import("./pages/Tickets"));
const TicketDetails = lazy(() => import("./pages/TicketDetails"));
const Settings = lazy(() => import("./pages/Settings"));
const Domains = lazy(() => import("./pages/Domains"));
const AccountsPayable = lazy(() => import("./pages/AccountsPayable"));
const AccountsReceivable = lazy(() => import("./pages/AccountsReceivable"));
const PaymentNotifications = lazy(() => import("./pages/PaymentNotifications"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Reports = lazy(() => import("./pages/Reports"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Notes = lazy(() => import("./pages/Notes"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const TicketMetrics = lazy(() => import("./pages/TicketMetrics"));
const Proposals = lazy(() => import("./pages/Proposals"));
const WhatsAppBroadcast = lazy(() => import("./pages/WhatsAppBroadcast"));

// Client Portal
const ClientDashboard = lazy(() => import('./pages/portal/Dashboard'));
const ClientTickets = lazy(() => import('./pages/portal/Tickets'));
const ClientContracts = lazy(() => import('./pages/portal/Contracts'));
const ClientTicketDetails = lazy(() => import('./pages/portal/TicketDetails'));

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Avoid unnecessary refetches
      retry: 1,
      staleTime: 30000, // 30s default
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <DensityProvider>
        <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <UpdatePrompt />
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas - SEM AuthProvider */}
          <Route path="/install" element={<Install />} />
          <Route path="/cadastro-cliente" element={<ClientRegistration />} />
          <Route path="/abrir-chamado" element={<PublicTicket />} />
          <Route path="/base-conhecimento" element={<KnowledgeBasePublic />} />
          <Route path="/base-conhecimento/:slug" element={<KnowledgeBasePublic />} />
          <Route path="/approval/:token" element={<ProjectApproval />} />
          <Route path="/approval-success" element={<ApprovalSuccess />} />
          
          {/* Rotas protegidas - COM AuthProvider */}
          <Route path="/*" element={
            <AuthProvider>
              <KeyboardShortcutsProvider>
                <BottomNavigation />
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/portal" element={<ClientDashboard />} />
                    <Route path="/portal/tickets" element={<ClientTickets />} />
                    <Route path="/portal/tickets/:id" element={<ClientTicketDetails />} />
                    <Route path="/portal/contracts" element={<ClientContracts />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/clients/:id" element={<ClientDetail />} />
                    <Route path="/tickets" element={<Tickets />} />
                    <Route path="/tickets/:id" element={<TicketDetails />} />
                    <Route path="/ticket-metrics" element={<TicketMetrics />} />
                    <Route path="/domains" element={<Domains />} />
                    <Route path="/financeiro" element={<Navigate to="/financeiro/receber" replace />} />
                    <Route path="/financeiro/pagar" element={<AccountsPayable />} />
                    <Route path="/financeiro/receber" element={<AccountsReceivable />} />
                    <Route path="/financeiro/notificacoes" element={<PaymentNotifications />} />
                    <Route path="/contracts" element={<Contracts />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/manutencao" element={<Maintenance />} />
                    <Route path="/anotacoes" element={<Notes />} />
                    <Route path="/projetos" element={<Projects />} />
                    <Route path="/projetos/:id" element={<ProjectDetail />} />
                    <Route path="/propostas" element={<Proposals />} />
                    <Route path="/whatsapp-broadcast" element={<WhatsAppBroadcast />} />
                    <Route path="/admin/base-conhecimento" element={<KnowledgeBase />} />
                    <Route path="/departments" element={<Navigate to="/settings" replace />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </KeyboardShortcutsProvider>
            </AuthProvider>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </DensityProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
