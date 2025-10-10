import { LayoutDashboard, Users, Ticket, Settings, Moon, Sun } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export function AppSidebar() {
  const { state } = useSidebar();
  const { userRole } = useAuth();
  const collapsed = state === 'collapsed';
  const [isDark, setIsDark] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    fetchTicketCount();
  }, []);

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
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CP</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-sm">ClientPulse</h2>
              <p className="text-xs text-muted-foreground">Suite</p>
            </div>
          )}
        </div>
      </div>

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

      <div className="mt-auto p-4 border-t border-sidebar-border">
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
      </div>
    </Sidebar>
  );
}
