import { LayoutDashboard, Users, Ticket, Settings, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
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
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { user, userRole } = useAuth();
  const collapsed = state === 'collapsed';
  const [isDark, setIsDark] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    fetchTicketCount();
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

    return () => observer.disconnect();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
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

  const adminItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Clientes', url: '/clients', icon: Users },
    { title: 'Tickets', url: '/tickets', icon: Ticket },
    { title: 'Configurações', url: '/settings', icon: Settings },
  ];

  const clientItems = [
    { title: 'Meus Tickets', url: '/', icon: Ticket },
    { title: 'Novo Ticket', url: '/new-ticket', icon: Ticket },
  ];

  const items = userRole === 'admin' ? adminItems : clientItems;

  const badgeCounts: Record<string, number> = {
    'Tickets': ticketCount,
    'Meus Tickets': ticketCount,
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border transition-all duration-300">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img 
              src={isDark ? logoDark : logoLight} 
              alt="Logo" 
              className="h-8 w-8 flex-shrink-0"
            />
            {!collapsed && profile && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.full_name}</p>
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
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{userRole === 'admin' ? 'Menu Principal' : 'Suporte'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
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
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span>{item.title}</span>
                          {badgeCounts[item.title] && (
                            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                              {badgeCounts[item.title]}
                            </Badge>
                          )}
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

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={toggleTheme}
          className="w-full justify-start"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
        </Button>
        {!collapsed && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            v1.0.0
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
