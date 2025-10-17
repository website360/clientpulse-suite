export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

/**
 * Normalizes any status input (Portuguese, English, with or without accents)
 * to a valid ticket_status enum value
 */
export function normalizeTicketStatus(value: string): TicketStatus {
  // Normalize string: remove accents, lowercase, trim
  const normalized = (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Mapping dictionary
  const statusMap: Record<string, TicketStatus> = {
    // English
    'open': 'open',
    'in_progress': 'in_progress',
    'in progress': 'in_progress',
    'waiting': 'waiting',
    'resolved': 'resolved',
    'closed': 'closed',
    // Portuguese
    'aberto': 'open',
    'em andamento': 'in_progress',
    'aguardando': 'waiting',
    'resolvido': 'resolved',
    'fechado': 'closed',
  };

  const result = statusMap[normalized];
  
  if (!result) {
    throw new Error(`Status inválido: "${value}". Valores permitidos: open, in_progress, waiting, resolved, closed`);
  }

  return result;
}

/**
 * Generates an update object with status and appropriate timestamps
 */
export function getStatusUpdateData(newStatus: string | TicketStatus) {
  const status = normalizeTicketStatus(newStatus);
  const updateData: any = { status };

  if (status === 'resolved') {
    updateData.resolved_at = new Date().toISOString();
  } else if (status === 'closed') {
    updateData.closed_at = new Date().toISOString();
  }

  return updateData;
}
