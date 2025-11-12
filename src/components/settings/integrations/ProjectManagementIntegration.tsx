import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trello, CheckCircle, XCircle } from 'lucide-react';

export function ProjectManagementIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [platform, setPlatform] = useState('trello');
  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [boardId, setBoardId] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['project-mgmt-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .in('key', ['project_mgmt_enabled', 'project_mgmt_platform', 'project_mgmt_api_key', 'project_mgmt_api_token', 'project_mgmt_board_id']);
      
      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      setIsActive(settingsMap?.project_mgmt_enabled?.value === 'true');
      setPlatform(settingsMap?.project_mgmt_platform?.value || 'trello');
      setApiKey(settingsMap?.project_mgmt_api_key?.value || '');
      setApiToken(settingsMap?.project_mgmt_api_token?.value || '');
      setBoardId(settingsMap?.project_mgmt_board_id?.value || '');

      return settingsMap;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: 'project_mgmt_enabled', value: isActive.toString(), is_active: true },
        { key: 'project_mgmt_platform', value: platform, is_active: true },
        { key: 'project_mgmt_api_key', value: apiKey, is_active: true },
        { key: 'project_mgmt_api_token', value: apiToken, is_active: true },
        { key: 'project_mgmt_board_id', value: boardId, is_active: true },
      ];

      for (const setting of settingsToSave) {
        const exists = settings?.[setting.key];
        
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-mgmt-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações foram atualizadas.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trello className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Gestão de Projetos</CardTitle>
              <CardDescription>
                Exporte projetos para Trello ou Jira
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
          <Label htmlFor="project-mgmt-active">Ativar integração</Label>
          <Switch
            id="project-mgmt-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {isActive && (
          <>
            <div>
              <Label htmlFor="platform">Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trello">Trello</SelectItem>
                  <SelectItem value="jira">Jira</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={platform === 'trello' ? 'Trello API Key' : 'Jira API Key'}
              />
            </div>

            <div>
              <Label htmlFor="api-token">API Token</Label>
              <Input
                id="api-token"
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label htmlFor="board-id">Board/Project ID</Label>
              <Input
                id="board-id"
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                placeholder={platform === 'trello' ? 'ID do quadro Trello' : 'ID do projeto Jira'}
              />
            </div>
          </>
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
