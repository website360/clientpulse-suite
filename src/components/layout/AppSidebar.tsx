import { 
  LayoutDashboard, Users, Ticket, Settings, Moon, Sun, Globe, DollarSign, 
  FileText, BarChart3, BookOpen, Copy, CheckSquare, Wrench, StickyNote, 
  FolderKanban, ChevronLeft, ChevronRight, Send, LogOut, MessageCircle
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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
import { AvatarInitials } from '@/components/ui/avatar-initials';

export function AppSidebar() {
  const { state, toggleSidebar, open } = useSidebar();
  const isCollapsed = !open;
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [profile, setProfile] = useState<{ full_name: string; email: string; nickname?: string; avatar_url?: string | null } | null>(() => {
    const cachedProfile = sessionStorage.getItem('user-profile');
    return cachedProfile ? JSON.parse(cachedProfile) : null;
  });
  const [menuLogo, setMenuLogo] = useState<{ light: string; dark: string }>(() => {
    const cachedLight = sessionStorage.getItem('logo-icon-light-url');
    const cachedDark = sessionStorage.getItem('logo-icon-dark-url');
    
    return {
      light: cachedLight || logoLight,
      dark: cachedDark || logoDark,
    };
  });

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    fetchTicketCount();
    fetchTaskCount();
    
    const loadLogos = async () => {
      const { loadBrandingUrl } = await import('@/lib/branding');
      
      const lightUrl = await loadBrandingUrl('logo-icon-light', logoLight);
      const darkUrl = await loadBrandingUrl('logo-icon-dark', logoDark);
      
      sessionStorage.setItem('logo-icon-light-url', lightUrl);
      sessionStorage.setItem('logo-icon-dark-url', darkUrl);
      
      setMenuLogo({
        light: lightUrl,
        dark: darkUrl,
      });
    };
    
    loadLogos();
    
    if (user) {
      fetchProfile();
    }

    const observer = new MutationObserver(() => {
      const newIsDark = document.documentElement.classList.contains('dark');
      setIsDark(newIsDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const handleLogoUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.type === 'logo-icon-light' || customEvent.detail.type === 'logo-icon-dark') {
        sessionStorage.removeItem('logo-icon-light-url');
        sessionStorage.removeItem('logo-icon-dark-url');
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
        .select('full_name, email, nickname, avatar_url')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      
      sessionStorage.setItem('user-profile', JSON.stringify(data));
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchTicketCount = async () => {
    try {
      const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting', 'in_progress']);
      
      if (error) throw error;
      setTicketCount(count || 0);
    } catch (error) {
      console.error('Error fetching ticket count:', error);
    }
  };

  const fetchTaskCount = async () => {
    try {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'done');
      
      if (error) throw error;
      setTaskCount(count || 0);
    } catch (error) {
      console.error('Error fetching task count:', error);
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

  const handleToggleSidebar = () => {
    toggleSidebar();
    const newState = open ? 'collapsed' : 'open';
    localStorage.setItem('sidebar-state', newState);
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

  const handleSignOut = async () => {
    await signOut();
  };

  // Menu sections for admin
  const mainMenuItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Mensagens', url: '/messages', icon: MessageCircle },
    { title: 'Clientes', url: '/clients', icon: Users },
    { title: 'Tickets', url: '/tickets', icon: Ticket, badge: ticketCount },
    { title: 'Tarefas', url: '/tasks', icon: CheckSquare, badge: taskCount },
    { title: 'Projetos', url: '/projetos', icon: FolderKanban },
    { title: 'Domínios', url: '/domains', icon: Globe },
    { title: 'Contratos', url: '/contracts', icon: FileText },
    { title: 'Manutenção', url: '/manutencao', icon: Wrench },
    { title: 'Ideias e Anotações', url: '/anotacoes', icon: StickyNote },
  ];

  const financeItems = [
    { title: 'Financeiro', url: '/financeiro/receber', icon: DollarSign },
    { title: 'Relatórios', url: '/reports', icon: BarChart3 },
  ];

  const systemItems = [
    { title: 'Disparos e Alertas', url: '/broadcast-messages', icon: Send },
    { title: 'Conhecimento', url: '/admin/base-conhecimento', icon: BookOpen, copyLink: true },
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

  const renderMenuItem = (item: any) => {
    const isActive = location.pathname === item.url || 
      (item.url !== '/' && item.url !== '/portal' && location.pathname.startsWith(item.url));

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild className={cn("h-10", isCollapsed && "justify-center px-2")}>
          <NavLink
            to={item.url}
            end={item.url === '/' || item.url === '/portal'}
            className={cn(
              "transition-all duration-200 rounded-lg group/item",
              isActive
                ? 'bg-primary text-[#f9f9f9] font-semibold'
                : 'text-sidebar-foreground hover:text-primary hover:bg-primary/10',
              !isCollapsed && 'px-3'
            )}
            title={isCollapsed ? item.title : undefined}
          >
            <item.icon className={cn(
              "flex-shrink-0",
              isCollapsed ? "h-5 w-5" : "h-[19px] w-[19px]",
              isActive ? 'text-[#f9f9f9]' : 'text-sidebar-foreground/80 group-hover/item:text-primary'
            )} />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span className="text-[14.5px]">{item.title}</span>
                <div className="flex items-center gap-1.5">
                  {item.badge > 0 && (
                    <span className={cn(
                      "inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-semibold rounded-full",
                      isActive 
                        ? "bg-[#f9f9f9]/20 text-[#f9f9f9]" 
                        : "bg-sidebar-accent text-sidebar-foreground/70"
                    )}>
                      {item.badge}
                    </span>
                  )}
                  {item.copyLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
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
    );
  };

  const renderMenuSection = (label: string, items: any[]) => (
    <SidebarGroup key={label} className="py-0.5">
      {!isCollapsed && (
        <SidebarGroupLabel className="text-[11.5px] font-bold tracking-widest text-sidebar-foreground/50 uppercase px-3 mb-1 mt-4">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map(renderMenuItem)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-sidebar-border bg-sidebar-background h-screen"
    >
      {/* Header with Logo */}
      <SidebarHeader className="px-4 py-5">
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
            <img 
              src={isDark ? menuLogo.dark : menuLogo.light} 
              alt="Logo" 
              className={cn(
                "flex-shrink-0 object-contain",
                isCollapsed ? "h-7 w-7" : "h-8 w-8"
              )}
            />
            {!isCollapsed && (
              <span className="text-[17px] font-bold text-white tracking-tight truncate">Agência May</span>
            )}
          </NavLink>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleSidebar}
              className="h-7 w-7 text-sidebar-foreground hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSidebar}
            className="h-7 w-7 mx-auto mt-2 text-sidebar-foreground hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </SidebarHeader>

      {/* Menu Content */}
      <SidebarContent className="px-3 py-2">
        {userRole === 'admin' ? (
          <>
            {renderMenuSection('Menu Principal', mainMenuItems)}
            {renderMenuSection('Financeiro', financeItems)}
            {renderMenuSection('Sistema', systemItems)}
          </>
        ) : userRole === 'contato' ? (
          renderMenuSection('Suporte', contatoItems)
        ) : (
          renderMenuSection('Portal do Cliente', clientItems)
        )}
      </SidebarContent>

      {/* Footer with User Profile */}
      <SidebarFooter className="border-t border-sidebar-border/30 p-3">
        {profile && (
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors",
            isCollapsed && "justify-center p-1"
          )}>
            <AvatarInitials 
              name={profile.nickname || profile.full_name || 'User'} 
              avatarUrl={profile.avatar_url}
              size="sm"
            />
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-white truncate">
                    {profile.nickname || profile.full_name}
                  </p>
                  <p className="text-[12px] text-sidebar-foreground/80 truncate">
                    {userRole === 'admin' ? 'Administrador' : 'Cliente'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="h-8 w-8 text-sidebar-foreground/70 hover:text-destructive flex-shrink-0"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
