import { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, Users, Ticket, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function WelcomeBanner() {
  const { user, userRole } = useAuth();
  const [visible, setVisible] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('welcome-banner-seen');
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('last-visit-date');
    
    setIsFirstVisit(!hasSeenWelcome);
    
    if (!hasSeenWelcome || lastVisit !== today) {
      setVisible(true);
      localStorage.setItem('last-visit-date', today);
    }
    
    fetchUserName();
  }, [user]);

  const fetchUserName = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, nickname')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      const name = data?.nickname || data?.full_name || user.email?.split('@')[0] || 'Usuário';
      setUserName(name);
    } catch (error) {
      console.error('Error fetching user name:', error);
      setUserName(user.email?.split('@')[0] || 'Usuário');
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('welcome-banner-seen', 'true');
  };

  if (!visible) return null;

  const greeting = isFirstVisit ? 'Bem-vindo' : 'Bem-vindo de volta';
  
  const quickStats = userRole === 'admin' ? [
    { icon: Ticket, label: 'Tickets', color: 'text-blue-500' },
    { icon: Users, label: 'Clientes', color: 'text-green-500' },
    { icon: DollarSign, label: 'Financeiro', color: 'text-purple-500' },
    { icon: TrendingUp, label: 'Relatórios', color: 'text-orange-500' },
  ] : [
    { icon: Ticket, label: 'Meus Tickets', color: 'text-blue-500' },
    { icon: DollarSign, label: 'Contratos', color: 'text-purple-500' },
  ];

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 animate-fade-in",
      "bg-gradient-to-br from-primary/5 via-background to-primary/10",
      "hover:shadow-lg transition-shadow duration-300"
    )}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative p-6">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-background/80"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {greeting}, {userName}!
              </h2>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              {isFirstVisit 
                ? 'Estamos felizes em tê-lo conosco. Explore todas as funcionalidades disponíveis.'
                : 'Que bom ter você aqui novamente. Veja o que há de novo no seu dashboard.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 md:gap-4">
            {quickStats.map((stat, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-background/50 backdrop-blur-sm border border-border",
                  "hover:bg-background/80 hover:scale-105 transition-all duration-200",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <stat.icon className={cn("h-4 w-4", stat.color)} />
                <span className="text-xs md:text-sm font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {isFirstVisit && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              💡 <strong>Dica rápida:</strong> Use <kbd className="px-2 py-1 bg-background rounded text-xs border">Ctrl+K</kbd> para busca rápida em todo o sistema
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
