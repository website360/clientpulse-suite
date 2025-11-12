/**
 * Web Notifications API utilities for PWA
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const permission = await requestNotificationPermission();

  if (permission !== 'granted') {
    console.warn('Permissão de notificação negada');
    return;
  }

  try {
    // Use Service Worker notification if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });
    } else {
      // Fallback to standard notification
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });
    }
  } catch (error) {
    console.error('Erro ao exibir notificação:', error);
  }
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

// Notification templates
export const NotificationTemplates = {
  newTicket: (ticketNumber: number, clientName: string) => ({
    title: '🎫 Novo Ticket',
    body: `Ticket #${ticketNumber} de ${clientName}`,
    tag: 'ticket-new',
    requireInteraction: true,
  }),

  ticketUpdate: (ticketNumber: number) => ({
    title: '💬 Atualização no Ticket',
    body: `Ticket #${ticketNumber} foi atualizado`,
    tag: 'ticket-update',
  }),

  paymentDue: (amount: number, dueDate: string) => ({
    title: '💰 Pagamento Próximo',
    body: `R$ ${amount.toFixed(2)} vence em ${dueDate}`,
    tag: 'payment-due',
    requireInteraction: true,
  }),

  maintenanceReminder: (clientName: string) => ({
    title: '🔧 Manutenção Agendada',
    body: `Manutenção pendente para ${clientName}`,
    tag: 'maintenance',
  }),

  projectApproval: (projectName: string) => ({
    title: '✅ Aprovação Necessária',
    body: `${projectName} aguarda sua aprovação`,
    tag: 'project-approval',
    requireInteraction: true,
  }),
};
