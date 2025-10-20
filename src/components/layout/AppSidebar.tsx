import { LayoutDashboard, Users, Ticket, Settings, Moon, Sun, Globe, DollarSign, FileText, BarChart3, BookOpen, Copy, CheckSquare, Wrench, StickyNote, FolderKanban } from 'lucide-react';
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
  const { state } = useSidebar();
  const { user, userRole } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [profile, setProfile] = useState<{ full_name: string; email: string; nickname?: string } | null>(null);
  const [menuLogo, setMenuLogo] = useState<{ light: string; dark: string }>({
    light: logoLight,
    dark: logoDark,
  });
  const [isContact, setIsContact] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    fetchTicketCount();
    
    // Carregar logos customizados do localStorage
    const customLogoLight = localStorage.getItem('app-logo-light');
    const customLogoDark = localStorage.getItem('app-logo-dark');
    
    setMenuLogo({
      light: customLogoLight || logoLight,
      dark: customLogoDark || logoDark,
    });
    
    if (user) {
      fetchProfile();
      fetchIsContact();
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

    return () => observer.disconnect();
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

  const fetchIsContact = async () => {
    try {
      if (!user?.id) return;
      const { data } = await supabase
        .from('client_contacts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsContact(!!data);
    } catch (e) {
      setIsContact(false);
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

  const items = userRole === 'admin' ? adminItems : isContact ? contatoItems : clientItems;

  const badgeCounts: Record<string, number> = {
    'Tickets': ticketCount,
    'Meus Tickets': ticketCount,
  };

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border h-screen sticky top-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
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
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{userRole === 'admin' ? 'Menu Principal' : 'Suporte'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="py-3">
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'hover:bg-sidebar-accent/50'
                      }
                    >
                      <item.icon className="h-4 w-4" />
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
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border p-4">
        <div className="text-xs text-muted-foreground text-center">
          v1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
