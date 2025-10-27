import { LayoutDashboard, Users, Ticket, Settings, Moon, Sun, Globe, DollarSign, FileText, BarChart3, BookOpen, Copy, CheckSquare, Wrench, StickyNote, FolderKanban, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { state, toggleSidebar, open } = useSidebar();
  const isCollapsed = !open;
  const { user, userRole } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [profile, setProfile] = useState<{ full_name: string; email: string; nickname?: string } | null>(null);
  const [menuLogo, setMenuLogo] = useState<{ light: string; dark: string }>({
    light: logoLight,
    dark: logoDark,
  });

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    fetchTicketCount();
    
    // Carregar logos do Storage (fonte principal) com fallback
    const loadLogos = async () => {
      const { loadBrandingUrl } = await import('@/lib/branding');
      
      const lightUrl = await loadBrandingUrl('logo-icon-light', logoLight);
      const darkUrl = await loadBrandingUrl('logo-icon-dark', logoDark);
      
      setMenuLogo({
        light: lightUrl,
        dark: darkUrl,
      });
    };
    
    loadLogos();
    
    if (user) {
      fetchProfile();
    }

    // Observer para mudanças no tema
    const observer = new MutationObserver(() => {
      const newIsDark = document.documentElement.classList.contains('dark');
      setIsDark(newIsDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Listener para atualizações de logo
    const handleLogoUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.type === 'logo-icon-light' || customEvent.detail.type === 'logo-icon-dark') {
        loadLogos();
      }
    };

    window.addEventListener('logoUpdated', handleLogoUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, nickname')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchTicketCount = async () => {
    try {
      const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setTicketCount(count || 0);
    } catch (error) {
      console.error('Error fetching ticket count:', error);
    }
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };


  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `${window.location.origin}/base-conhecimento`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'O link da Base de Conhecimento foi copiado para a área de transferência.',
    });
  };

  const adminItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Clientes', url: '/clients', icon: Users },
    { title: 'Tickets', url: '/tickets', icon: Ticket },
    { title: 'Domínios', url: '/domains', icon: Globe },
    { title: 'Projetos', url: '/projetos', icon: FolderKanban },
    { title: 'Financeiro', url: '/financeiro/receber', icon: DollarSign },
    { title: 'Contratos', url: '/contracts', icon: FileText },
    { title: 'Relatórios', url: '/reports', icon: BarChart3 },
    { title: 'Tarefas', url: '/tasks', icon: CheckSquare },
    { title: 'Manutenção', url: '/manutencao', icon: Wrench },
    { title: 'Ideias e Anotações', url: '/anotacoes', icon: StickyNote },
    { title: 'Base de Conhecimento', url: '/admin/base-conhecimento', icon: BookOpen },
    { title: 'Configurações', url: '/settings', icon: Settings },
  ];

  const clientItems = [
    { title: 'Dashboard', url: '/portal', icon: LayoutDashboard },
    { title: 'Meus Tickets', url: '/portal/tickets', icon: Ticket },
    { title: 'Contratos', url: '/portal/contracts', icon: FileText },
  ];

  const contatoItems = [
    { title: 'Dashboard', url: '/portal', icon: LayoutDashboard },
    { title: 'Meus Tickets', url: '/portal/tickets', icon: Ticket },
  ];

  // Usar userRole diretamente para evitar flickering no menu
  const items = userRole === 'admin' ? adminItems : userRole === 'contato' ? contatoItems : clientItems;

  const badgeCounts: Record<string, number> = {
    'Tickets': ticketCount,
    'Meus Tickets': ticketCount,
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-sidebar-border h-screen sticky top-0"
    >
      <SidebarHeader className={cn(
        "p-4 border-b border-sidebar-border",
        isCollapsed && "flex justify-center"
      )}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <img 
              src={isDark ? menuLogo.dark : menuLogo.light} 
              alt="Logo" 
              className="h-10 w-10 object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src={isDark ? menuLogo.dark : menuLogo.light} 
                alt="Logo" 
                className="h-10 w-10 flex-shrink-0 object-contain"
              />
              {profile && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.nickname || profile.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel>{userRole === 'admin' ? 'Menu Principal' : 'Suporte'}</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className={cn("gap-2", isCollapsed && "gap-4")}>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={cn(
                      "transition-all",
                      isCollapsed ? "justify-center py-8 px-0 min-h-[80px] w-full" : "py-4 justify-start"
                    )}
                  >
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        cn(
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'hover:bg-sidebar-accent/50',
                          isCollapsed ? 'flex justify-center items-center w-full min-h-[80px] p-4' : 'flex items-center'
                        )
                      }
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className={cn(
                        "transition-all",
                        isCollapsed ? "!h-12 !w-12" : "h-5 w-5 flex-shrink-0"
                      )} />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span className="text-[15px]">{item.title}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            {badgeCounts[item.title] && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {badgeCounts[item.title]}
                              </Badge>
                            )}
                            {item.title === 'Base de Conhecimento' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={handleCopyLink}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "w-full gap-2 transition-all",
            isCollapsed ? "justify-center px-0 py-8 min-h-[80px]" : "justify-start"
          )}
          title={isCollapsed ? (isDark ? 'Modo Claro' : 'Modo Escuro') : undefined}
        >
          {isDark ? (
            <Sun className={cn("transition-all", isCollapsed ? "!h-12 !w-12" : "h-5 w-5")} />
          ) : (
            <Moon className={cn("transition-all", isCollapsed ? "!h-12 !w-12" : "h-5 w-5")} />
          )}
          {!isCollapsed && (isDark ? 'Modo Claro' : 'Modo Escuro')}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
