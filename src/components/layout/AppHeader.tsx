import { User, Moon, Sun, Search, Command, Settings, LogOut } from 'lucide-react';
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
  '/notas': { title: 'Notas', subtitle: 'Bloco de notas rápido para texto corrido' },
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
    <header className="sticky top-0 z-40 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-b border-border/50">
      <div className="flex h-16 items-center gap-4 px-6">
        <SidebarTrigger className="lg:hidden" />
        
        {/* Page title & greeting */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[19px] font-bold text-foreground tracking-tight">
            {currentPage.title}
          </h1>
          <p className="text-[13.5px] text-muted-foreground capitalize hidden sm:block">
            {today} • {getGreeting()}, {userName.split(' ')[0]}
          </p>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>

          <NotificationCenter />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent transition-all duration-200 outline-none">
                <AvatarInitials name={userName} avatarUrl={profile?.avatar_url} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg" sideOffset={8}>
              <div className="flex items-center gap-3 p-3">
                <AvatarInitials name={userName} avatarUrl={profile?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate">{userName}</p>
                  <p className="text-[12.5px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg mx-1">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg mx-1">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive rounded-lg mx-1">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
