import { supabase } from "@/integrations/supabase/client";
import { normalizeTicketStatus } from "./tickets";

const STATUS_VALUE_MAP: Record<string, string> = {
  'Aberto': 'open',
  'Em Andamento': 'in_progress',
  'Aguardando': 'waiting',
  'Resolvido': 'resolved',
  'Fechado': 'closed',
};

/**
 * Atualiza o status de um ticket usando RPC com normalização garantida
 */
export async function updateTicketStatus(ticketId: string, newStatus: string) {
  // Camada 1: Mapear labels PT para EN (caso venham do UI antigo)
  const afterMap = STATUS_VALUE_MAP[newStatus] ?? newStatus;
  
  // Camada 2: Normalizar usando a função da lib
  const normalized = normalizeTicketStatus(afterMap);
  
  console.log('[updateTicketStatus]', { ticketId, incoming: newStatus, afterMap, normalized });
  
  // Camada 3: Usar RPC que também normaliza no banco
  const { data, error } = await supabase.rpc('set_ticket_status', {
    p_ticket_id: ticketId,
    p_new_status: normalized,
  });
  
  if (error) {
    console.error('[updateTicketStatus] Error:', error);
    throw error;
  }
  
  return data;
}
