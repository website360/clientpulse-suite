import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Tickets from "./pages/Tickets";
import TicketDetails from "./pages/TicketDetails";
import Settings from "./pages/Settings";
import Domains from "./pages/Domains";
import AccountsPayable from "./pages/AccountsPayable";
import AccountsReceivable from "./pages/AccountsReceivable";
import Contracts from "./pages/Contracts";
import Reports from "./pages/Reports";
import Tasks from "./pages/Tasks";
import Maintenance from "./pages/Maintenance";
import Notes from "./pages/Notes";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
// Removed GeneratedDocuments page
import ClientDashboard from './pages/portal/Dashboard';
import ClientTickets from './pages/portal/Tickets';
import ClientContracts from './pages/portal/Contracts';
import ClientTicketDetails from './pages/portal/TicketDetails';
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import KnowledgeBase from "./pages/KnowledgeBase";
import KnowledgeBasePublic from "./pages/public/KnowledgeBasePublic";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/base-conhecimento" element={<KnowledgeBasePublic />} />
            <Route path="/base-conhecimento/:slug" element={<KnowledgeBasePublic />} />
          <Route path="/portal" element={<ClientDashboard />} />
          <Route path="/portal/tickets" element={<ClientTickets />} />
          <Route path="/portal/tickets/:id" element={<ClientTicketDetails />} />
          <Route path="/portal/contracts" element={<ClientContracts />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetails />} />
            <Route path="/domains" element={<Domains />} />
            <Route path="/financeiro" element={<Navigate to="/financeiro/receber" replace />} />
            <Route path="/financeiro/pagar" element={<AccountsPayable />} />
            <Route path="/financeiro/receber" element={<AccountsReceivable />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/manutencao" element={<Maintenance />} />
            <Route path="/anotacoes" element={<Notes />} />
            <Route path="/projetos" element={<Projects />} />
            <Route path="/projetos/:id" element={<ProjectDetail />} />
            {/* documentos route removed */}
            <Route path="/admin/base-conhecimento" element={<KnowledgeBase />} />
            <Route path="/departments" element={<Navigate to="/settings" replace />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
