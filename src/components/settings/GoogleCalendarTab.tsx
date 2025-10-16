import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, AlertCircle } from "lucide-react";

export const GoogleCalendarTab = () => {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState({
    calendar_id: "",
    sync_enabled: true,
    sync_tickets: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("google_calendar_tokens")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setIsConnected(true);
        setSettings({
          calendar_id: data.calendar_id || "",
          sync_enabled: data.sync_enabled,
          sync_tickets: data.sync_tickets,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { userId: user.id }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error("Erro ao conectar:", error);
      toast.error("Erro ao iniciar conexão com Google Calendar");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("google_calendar_tokens")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setIsConnected(false);
      setSettings({
        calendar_id: "",
        sync_enabled: true,
        sync_tickets: false,
      });
      toast.success("Desconectado do Google Calendar");
    } catch (error) {
      console.error("Erro ao desconectar:", error);
      toast.error("Erro ao desconectar do Google Calendar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("google_calendar_tokens")
        .update({
          calendar_id: settings.calendar_id,
          sync_enabled: settings.sync_enabled,
          sync_tickets: settings.sync_tickets,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Configurações atualizadas com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Integração com Google Calendar</CardTitle>
          </div>
          <CardDescription>
            Sincronize suas tarefas e tickets com o Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Conecte sua conta do Google para sincronizar tarefas e tickets automaticamente com o Google Calendar.
                </AlertDescription>
              </Alert>
              <Button onClick={handleConnectCalendar} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Conectar com Google Calendar
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Status da Conexão</Label>
                    <p className="text-sm text-muted-foreground">
                      Conectado ao Google Calendar
                    </p>
                  </div>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                    Desconectar
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calendar_id">ID do Calendário (opcional)</Label>
                  <Input
                    id="calendar_id"
                    value={settings.calendar_id}
                    onChange={(e) => setSettings({ ...settings, calendar_id: e.target.value })}
                    placeholder="primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para usar o calendário principal
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync_enabled">Sincronização Ativa</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar sincronização automática de tarefas
                    </p>
                  </div>
                  <Switch
                    id="sync_enabled"
                    checked={settings.sync_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, sync_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync_tickets">Sincronizar Tickets</Label>
                    <p className="text-sm text-muted-foreground">
                      Incluir tickets abertos no calendário
                    </p>
                  </div>
                  <Switch
                    id="sync_tickets"
                    checked={settings.sync_tickets}
                    onCheckedChange={(checked) => setSettings({ ...settings, sync_tickets: checked })}
                  />
                </div>

                <Button onClick={handleUpdateSettings} disabled={loading} className="w-full">
                  {loading ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
