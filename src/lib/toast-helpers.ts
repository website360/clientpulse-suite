/**
 * Toast Helper Functions
 * 
 * Simplified API for showing toast notifications with predefined styles.
 * 
 * Usage:
 * ```typescript
 * import { showSuccess, showError, showWarning, showInfo } from '@/lib/toast-helpers';
 * 
 * showSuccess('Operação realizada!', 'Cliente cadastrado com sucesso');
 * showError('Erro ao salvar', 'Tente novamente mais tarde');
 * showWarning('Atenção!', 'Alguns campos estão vazios');
 * showInfo('Nova atualização', 'Sistema atualizado para versão 2.0');
 * ```
 */

import { toast } from "@/hooks/use-toast";

export function showSuccess(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: "success",
  });
}

export function showError(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: "destructive",
  });
}

export function showWarning(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: "warning",
  });
}

export function showInfo(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: "info",
  });
}

// Legacy compatibility - accepts object with title/description
export function showToast(options: {
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive" | "warning" | "info";
}) {
  return toast(options);
}
