import { User, Moon, Sun, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationCenter } from './NotificationCenter';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppHeaderProps {
  breadcrumbLabel?: string;
}

// Page titles and subtitles
const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Visão geral do seu negócio' },
  '/clients': { title: 'Clientes', subtitle: 'Gerencie sua base de clientes' },
  '/tickets': { title: 'Tickets', subtitle: 'Central de atendimento' },
  '/tasks': { title: 'Tarefas', subtitle: 'Acompanhe suas atividades' },
  '/projetos': { title: 'Projetos', subtitle: 'Gestão de projetos' },
  '/domains': { title: 'Domínios', subtitle: 'Controle de domínios' },
  '/contracts': { title: 'Contratos', subtitle: 'Gestão de contratos' },
  '/manutencao': { title: 'Manutenção', subtitle: 'Manutenções programadas' },
  '/anotacoes': { title: 'Ideias e Anotações', subtitle: 'Suas notas e ideias' },
  '/financeiro/receber': { title: 'Contas a Receber', subtitle: 'Gestão financeira' },
  '/financeiro/pagar': { title: 'Contas a Pagar', subtitle: 'Gestão financeira' },
  '/reports': { title: 'Relatórios', subtitle: 'Análises e métricas' },
  '/settings': { title: 'Configurações', subtitle: 'Personalize o sistema' },
  '/broadcast-messages': { title: 'Disparos e Alertas', subtitle: 'Comunicação em massa' },
  '/admin/base-conhecimento': { title: 'Base de Conhecimento', subtitle: 'Artigos e tutoriais' },
};

export function AppHeader({ breadcrumbLabel }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<{ full_name: string; nickname?: string; avatar_url?: string } | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Get current page info
  const currentPage = pageTitles[location.pathname] || { 
    title: breadcrumbLabel || 'Página', 
    subtitle: '' 
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    
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
        .select('full_name, nickname, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
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

  const userName = profile?.nickname || profile?.full_name || 'Usuário';
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        <SidebarTrigger className="lg:hidden" />
        
        {/* Page Title and Greeting */}
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {currentPage.title}
          </h1>
          <p className="text-xs text-muted-foreground capitalize hidden sm:block">
            {today} • {getGreeting()}, {userName.split(' ')[0]}
          </p>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center">
          <Button
            variant="outline"
            className="h-9 w-64 justify-start text-muted-foreground font-normal rounded-lg border-border bg-muted/30"
            onClick={() => {
              // Trigger command palette
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              document.dispatchEvent(event);
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Buscar...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <NotificationCenter />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <AvatarInitials name={userName} avatarUrl={profile?.avatar_url} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-3 p-2">
                <AvatarInitials name={userName} avatarUrl={profile?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {isDark ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Modo Escuro
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
