import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumbLabel?: string;
}

export function DashboardLayout({ children, breadcrumbLabel }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  
  // Inicializar estado do sidebar do localStorage antes do render
  const getInitialSidebarState = () => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebar-state');
      return savedState !== 'collapsed';
    }
    return true;
  };

  // Verificar status do WhatsApp ao abrir o sistema
  useEffect(() => {
    const checkWhatsAppOnStartup = async () => {
      // Verificar apenas uma vez por sessão
      if (sessionStorage.getItem('whatsapp-status-checked')) return;
      
      if (!user) return;

      try {
        // Verificar se usuário é admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roles?.role !== 'admin') return;

        // Verificar se integração está ativa
        const { data: settings } = await supabase
          .from('integration_settings')
          .select('value')
          .eq('key', 'whatsapp_enabled')
          .single();

        if (settings?.value !== 'true') return;

        // Testar conexão
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { action: "check_status" }
        });

        if (error || !data?.success) {
          toast.error("WhatsApp desconectado", {
            description: "A integração com WhatsApp não está funcionando. Verifique as configurações.",
            duration: 6000,
          });
        }

        sessionStorage.setItem('whatsapp-status-checked', 'true');
      } catch (error) {
        // Silenciar erros para não atrapalhar a navegação
        console.error('Erro ao verificar status do WhatsApp:', error);
      }
    };

    checkWhatsAppOnStartup();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider defaultOpen={getInitialSidebarState()}>
      <div className="flex w-full h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full overflow-hidden">
          <AppHeader breadcrumbLabel={breadcrumbLabel} />
          <main className="flex-1 p-6 bg-background-secondary overflow-y-auto pb-20 md:pb-6">
            <div className="max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
