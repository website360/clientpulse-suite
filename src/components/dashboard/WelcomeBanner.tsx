import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function WelcomeBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<number>(0);
  const [pendingTickets, setPendingTickets] = useState<number>(0);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastDismissed = localStorage.getItem('welcome-banner-dismissed');
    const lastVisit = localStorage.getItem('last-visit-date');
    
    // Primeira visita se nunca foi fechado
    setIsFirstVisit(!lastDismissed);
    
    // Mostra se nunca foi fechado OU se foi fechado em um dia diferente
    if (!lastDismissed || lastDismissed !== today) {
      setVisible(true);
    }
    
    // Atualiza última visita
    if (lastVisit !== today) {
      localStorage.setItem('last-visit-date', today);
    }
    
    fetchUserName();
    fetchPendingStats();
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

  const fetchPendingStats = async () => {
    if (!user) return;
    
    try {
      // Fetch pending tasks
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['todo', 'in_progress'])
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
      
      // Fetch pending tickets
      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting', 'in_progress'])
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
      
      setPendingTasks(tasksCount || 0);
      setPendingTickets(ticketsCount || 0);
    } catch (error) {
      console.error('Error fetching pending stats:', error);
    }
  };

  const handleDismiss = () => {
    const today = new Date().toDateString();
    setVisible(false);
    localStorage.setItem('welcome-banner-dismissed', today);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return {
        emoji: '☀️',
        text: isFirstVisit ? 'Bom dia' : 'Bom dia de volta'
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        emoji: '🌤️',
        text: isFirstVisit ? 'Boa tarde' : 'Boa tarde de volta'
      };
    } else {
      return {
        emoji: '🌙',
        text: isFirstVisit ? 'Boa noite' : 'Boa noite de volta'
      };
    }
  };

  if (!visible) return null;

  const greeting = getGreeting();

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

        <div className="flex items-center gap-2">
          <span className="text-2xl animate-[bounce_1s_ease-in-out_3] inline-block">
            {greeting.emoji}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {greeting.text}, {userName}!
          </h2>
        </div>
        <p className="text-muted-foreground text-sm md:text-base mt-2">
          {isFirstVisit 
            ? 'Estamos felizes em tê-lo conosco. Explore todas as funcionalidades disponíveis.'
            : 'Que bom ter você aqui novamente. Veja o que há de novo no seu dashboard.'}
        </p>
        
        {(pendingTasks > 0 || pendingTickets > 0) && (
          <div className="flex flex-wrap gap-3 mt-4">
            {pendingTasks > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-background/60 backdrop-blur-sm rounded-lg border border-border/50">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium">
                  {pendingTasks} {pendingTasks === 1 ? 'tarefa pendente' : 'tarefas pendentes'}
                </span>
              </div>
            )}
            {pendingTickets > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-background/60 backdrop-blur-sm rounded-lg border border-border/50">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-medium">
                  {pendingTickets} {pendingTickets === 1 ? 'ticket pendente' : 'tickets pendentes'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
