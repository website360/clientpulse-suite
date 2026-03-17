import { supabase } from '@/integrations/supabase/client';

export interface EmailSyncResult {
  success: boolean;
  messagesCount?: number;
  error?: string;
}

/**
 * Sync emails from IMAP server for a specific account
 */
export async function syncEmailAccount(
  accountId: string, 
  password: string,
  email: string,
  imapServer: string,
  imapPort: number
): Promise<EmailSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-emails', {
      body: {
        accountId,
        password,
        email,
        imapServer,
        imapPort,
      },
    });

    if (error) {
      console.error('Error syncing emails:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return data as EmailSyncResult;
  } catch (error) {
    console.error('Error calling sync function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch messages from database for a specific account
 */
export async function fetchMessages(accountId?: string) {
  try {
    const SUPABASE_URL = "https://pjnbsuwkxzxcfaetywjs.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0";

    let url = `${SUPABASE_URL}/rest/v1/messages?select=*&order=created_at.desc&limit=100`;

    if (accountId && accountId !== 'all') {
      url += `&account_id=eq.${encodeURIComponent(accountId)}`;
    }

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[fetchMessages] HTTP error:', response.status, errText);
      return [];
    }

    const data = await response.json();
    console.log(`[fetchMessages] Loaded ${data?.length || 0} messages from DB`);
    return data || [];
  } catch (error) {
    console.error('[fetchMessages] Error:', error);
    return [];
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    return false;
  }
}

/**
 * Toggle star on message
 */
export async function toggleMessageStar(messageId: string, starred: boolean) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_starred: starred })
      .eq('id', messageId);

    if (error) {
      console.error('Error toggling star:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error toggling star:', error);
    return false;
  }
}

/**
 * Send an email via SMTP using the send-custom-email Edge Function
 */
export async function sendEmailMessage(params: {
  accountId: string;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  smtpServer: string;
  smtpPort: number;
  password: string;
}) {
  try {
    const { data, error } = await supabase.functions.invoke('send-custom-email', {
      body: params,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; message?: string; error?: string };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get sync status for an account
 */
export async function getSyncStatus(accountId: string) {
  try {
    const { data, error } = await supabase
      .from('email_sync_status')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore "not found" error
      console.error('Error getting sync status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting sync status:', error);
    return null;
  }
}
