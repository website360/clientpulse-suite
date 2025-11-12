import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function WelcomeBanner() {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const [isFirstVisit, setIsFirstVisit] = useState(false);

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
      </div>
    </Card>
  );
}
