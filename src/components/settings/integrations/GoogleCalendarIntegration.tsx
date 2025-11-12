import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';

export function GoogleCalendarIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['calendar-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .in('key', ['google_calendar_enabled', 'google_calendar_token']);
      
      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      setIsActive(settingsMap?.google_calendar_enabled?.value === 'true');

      return settingsMap;
    }
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      // Chamar edge function para iniciar OAuth
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth');
      
      if (error) throw error;
      
      if (data?.authUrl) {
        window.open(data.authUrl, '_blank', 'width=500,height=600');
      }
    },
    onError: () => {
      toast({
        title: 'Erro ao conectar',
        description: 'Não foi possível iniciar a conexão com o Google Calendar.',
        variant: 'destructive',
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const setting = {
        key: 'google_calendar_enabled',
        value: isActive.toString(),
        is_active: true
      };

      const exists = settings?.google_calendar_enabled;
      
      if (exists) {
        const { error } = await supabase
          .from('integration_settings')
          .update(setting)
          .eq('id', exists.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('integration_settings')
          .insert(setting);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do Google Calendar foram atualizadas.',
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                Sincronize tarefas e manutenções com o Google Calendar
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="calendar-active">Ativar integração</Label>
          <Switch
            id="calendar-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {isActive && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta do Google para sincronizar automaticamente tarefas e manutenções agendadas.
            </p>
            
            <Button 
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              variant="outline"
            >
              {connectMutation.isPending ? 'Conectando...' : 'Conectar com Google'}
            </Button>
          </div>
        )}

        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
}
