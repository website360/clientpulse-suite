import { 
  LayoutDashboard, Users, Ticket, Settings, Moon, Sun, Globe, DollarSign, 
  FileText, BarChart3, BookOpen, Copy, CheckSquare, Wrench, StickyNote, 
  FolderKanban, ChevronLeft, ChevronRight, Send, LogOut
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
  const [profile, setProfile] = useState<{ full_name: string; email: string; nickname?: string } | null>(() => {
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
        .select('full_name, email, nickname')
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
    { title: 'Clientes', url: '/clients', icon: Users },
    { title: 'Tickets', url: '/tickets', icon: Ticket, badge: ticketCount },
    { title: 'Tarefas', url: '/tasks', icon: CheckSquare, badge: taskCount },
    { title: 'Projetos', url: '/projetos', icon: FolderKanban },
  ];

  const resourceItems = [
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
      (item.url !== '/' && location.pathname.startsWith(item.url));

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild className={cn("h-10", isCollapsed && "justify-center px-2")}>
          <NavLink
            to={item.url}
            end={item.url === '/' || item.url === '/portal'}
            className={cn(
              "transition-all duration-200 rounded-lg group/item",
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-primary/90 text-muted-foreground hover:text-white',
              !isCollapsed && 'px-3'
            )}
            title={isCollapsed ? item.title : undefined}
          >
            <item.icon className={cn(
              "flex-shrink-0 transition-all duration-200",
              isCollapsed ? "h-5 w-5" : "h-4 w-4",
              isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover/item:text-white'
            )} />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span className="text-sm font-medium">{item.title}</span>
                <div className="flex items-center gap-1.5">
                  {item.badge > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "h-5 min-w-[20px] px-1.5 text-xs font-medium",
                        isActive 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                    {item.copyLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-5 w-5 p-0 transition-opacity",
                        isActive ? "text-primary-foreground hover:bg-primary-foreground/20" : "text-muted-foreground hover:text-foreground"
                      )}
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
    <SidebarGroup key={label}>
      {!isCollapsed && (
        <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase px-3 mb-1">
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
      className="border-r border-border bg-background h-screen"
    >
      {/* Header with Logo and Toggle */}
      <SidebarHeader className="p-4 border-b border-border">
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center gap-3">
            <img 
              src={isDark ? menuLogo.dark : menuLogo.light} 
              alt="Logo" 
              className={cn(
                "flex-shrink-0 object-contain transition-all",
                isCollapsed ? "h-8 w-8" : "h-9 w-9"
              )}
            />
            {!isCollapsed && (
              <div>
                <h1 className="text-sm font-bold text-foreground">Agency OS</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sistema de Gestão</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleSidebar}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
            className="h-8 w-8 mx-auto mt-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </SidebarHeader>

      {/* Menu Content */}
      <SidebarContent className="px-2 py-4">
        {userRole === 'admin' ? (
          <>
            {renderMenuSection('Menu Principal', mainMenuItems)}
            {renderMenuSection('Recursos', resourceItems)}
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
      <SidebarFooter className="border-t border-border p-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "w-full gap-2 justify-start mb-3 text-muted-foreground hover:text-foreground",
            isCollapsed && "justify-center px-0"
          )}
          title={isCollapsed ? (isDark ? 'Modo Claro' : 'Modo Escuro') : undefined}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!isCollapsed && (
            <span className="text-sm">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          )}
        </Button>

        {/* User Profile */}
        {profile && (
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-muted/50",
            isCollapsed && "justify-center p-2"
          )}>
            <AvatarInitials 
              name={profile.nickname || profile.full_name || 'User'} 
              size="sm"
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile.nickname || profile.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userRole === 'admin' ? 'Administrador' : 'Cliente'}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
