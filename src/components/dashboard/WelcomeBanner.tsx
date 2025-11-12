import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { DailyPendenciesModal } from './DailyPendenciesModal';
import { addDays, format } from 'date-fns';

export function WelcomeBanner() {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [totalPendencies, setTotalPendencies] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('last-visit-date');
    
    // Primeira visita se nunca visitou antes
    setIsFirstVisit(!lastVisit);
    
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
      const today = new Date();
      const nextWeek = addDays(today, 7);
      const nextMonth = addDays(today, 30);

      let total = 0;

      // Tarefas pendentes
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['todo', 'in_progress'])
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
      total += tasksCount || 0;

      // Tickets pendentes
      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting', 'in_progress'])
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
      total += ticketsCount || 0;

      // Contratos próximos ao vencimento (30 dias)
      const { count: contractsCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('end_date', 'is', null)
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .lte('end_date', format(nextMonth, 'yyyy-MM-dd'));
      total += contractsCount || 0;

      // Contas a receber (7 dias)
      const { count: receivablesCount } = await supabase
        .from('accounts_receivable')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .lte('due_date', format(nextWeek, 'yyyy-MM-dd'));
      total += receivablesCount || 0;

      // Contas a pagar (7 dias)
      const { count: payablesCount } = await supabase
        .from('accounts_payable')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .lte('due_date', format(nextWeek, 'yyyy-MM-dd'));
      total += payablesCount || 0;

      // Domínios vencidos ou próximos ao vencimento (30 dias)
      const { count: domainsCount } = await supabase
        .from('domains')
        .select('*', { count: 'exact', head: true })
        .not('expire_date', 'is', null)
        .lte('expire_date', format(nextMonth, 'yyyy-MM-dd'));
      total += domainsCount || 0;

      setTotalPendencies(total);
    } catch (error) {
      console.error('Error fetching pending stats:', error);
    }
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

  if (!user) return null;

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
        
        {totalPendencies > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-background/60 backdrop-blur-sm rounded-lg border border-primary/30 hover:bg-background/80 hover:border-primary/50 transition-all duration-200 cursor-pointer hover:scale-105"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">
                {totalPendencies} {totalPendencies === 1 ? 'pendência' : 'pendências'} para revisar
              </span>
            </button>
          </div>
        )}
      </div>

      <DailyPendenciesModal open={modalOpen} onOpenChange={setModalOpen} />
    </Card>
  );
}
