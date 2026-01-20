import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  WhiteLabelSettings,
  defaultSettings,
  applyWhiteLabelSettings,
  saveSettingsToLocalStorage,
  loadSettingsFromLocalStorage,
} from '@/lib/whitelabel';

export function useWhiteLabel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isApplied, setIsApplied] = useState(false);

  // Load settings from database
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['whitelabel-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whitelabel_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching whitelabel settings:', error);
        return null;
      }

      return data as WhiteLabelSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<WhiteLabelSettings>) => {
      if (!settings?.id) throw new Error('No settings found');

      const { data, error } = await supabase
        .from('whitelabel_settings')
        .update(newSettings)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data as WhiteLabelSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whitelabel-settings'] });
      saveSettingsToLocalStorage(data);
      applyWhiteLabelSettings(data);
      toast({
        title: 'Configurações salvas',
        description: 'As alterações foram aplicadas com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating whitelabel settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    },
  });

  // Reset to defaults mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error('No settings found');

      const { data, error } = await supabase
        .from('whitelabel_settings')
        .update(defaultSettings)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data as WhiteLabelSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whitelabel-settings'] });
      saveSettingsToLocalStorage(data);
      applyWhiteLabelSettings(data);
      toast({
        title: 'Configurações restauradas',
        description: 'Os valores padrão foram restaurados.',
      });
    },
    onError: (error) => {
      console.error('Error resetting whitelabel settings:', error);
      toast({
        title: 'Erro ao restaurar',
        description: 'Não foi possível restaurar as configurações.',
        variant: 'destructive',
      });
    },
  });

  // Apply settings on initial load
  useEffect(() => {
    if (isApplied) return;

    // Try to load from localStorage first for fast initial render
    const cached = loadSettingsFromLocalStorage();
    if (cached) {
      applyWhiteLabelSettings(cached);
    }

    // Then apply from database when loaded
    if (settings) {
      applyWhiteLabelSettings(settings);
      saveSettingsToLocalStorage(settings);
      setIsApplied(true);
    }
  }, [settings, isApplied]);

  return {
    settings: settings || (defaultSettings as WhiteLabelSettings),
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    resetToDefaults: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}

// Hook to apply white label on app initialization
export function useWhiteLabelInit() {
  useEffect(() => {
    // Load from localStorage immediately for fast initial render
    const cached = loadSettingsFromLocalStorage();
    if (cached) {
      applyWhiteLabelSettings(cached);
    }
  }, []);
}
