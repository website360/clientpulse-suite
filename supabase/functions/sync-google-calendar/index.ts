import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getGoogleCredentials(supabaseClient: any) {
  const { data: settings } = await supabaseClient
    .from('google_calendar_settings')
    .select('client_id, client_secret')
    .eq('is_active', true)
    .maybeSingle();

  if (settings?.client_id && settings?.client_secret) {
    return {
      clientId: settings.client_id,
      clientSecret: settings.client_secret
    };
  }

  return {
    clientId: Deno.env.get('GOOGLE_CLIENT_ID'),
    clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET')
  };
}

async function getValidAccessToken(supabaseClient: any, userId: string) {
  const { data: tokenData } = await supabaseClient
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!tokenData) {
    throw new Error('No Google Calendar connection found');
  }

  const now = new Date();
  const expiry = new Date(tokenData.token_expiry);

  if (now >= expiry) {
    const credentials = await getGoogleCredentials(supabaseClient);
    const clientId = credentials.clientId;
    const clientSecret = credentials.clientSecret;

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await refreshResponse.json();
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    await supabaseClient
      .from('google_calendar_tokens')
      .update({
        access_token: tokens.access_token,
        token_expiry: newExpiry.toISOString(),
      })
      .eq('user_id', userId);

    return { accessToken: tokens.access_token, calendarId: tokenData.calendar_id };
  }

  return { accessToken: tokenData.access_token, calendarId: tokenData.calendar_id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { task_id, ticket_id, action } = await req.json();

    if (action === 'sync_task' && task_id) {
      const { data: task } = await supabaseClient
        .from('tasks')
        .select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)')
        .eq('id', task_id)
        .single();

      if (!task || !task.assigned_to) {
        throw new Error('Task not found or not assigned');
      }

      const { data: settings } = await supabaseClient
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', task.assigned_to)
        .eq('sync_enabled', true)
        .single();

      if (!settings) {
        return new Response(
          JSON.stringify({ message: 'Google Calendar sync not enabled for this user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { accessToken, calendarId } = await getValidAccessToken(supabaseClient, task.assigned_to);

      const event = {
        summary: task.title,
        description: task.description || '',
        start: task.start_time 
          ? { dateTime: new Date(task.start_time).toISOString() }
          : { dateTime: new Date(task.due_date).toISOString() },
        end: task.end_time
          ? { dateTime: new Date(task.end_time).toISOString() }
          : { dateTime: new Date(new Date(task.due_date).getTime() + 3600000).toISOString() },
      };

      let calendarResponse;
      if (task.google_event_id) {
        calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${task.google_event_id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );
      } else {
        calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        const eventData = await calendarResponse.json();
        await supabaseClient
          .from('tasks')
          .update({ google_event_id: eventData.id })
          .eq('id', task_id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_task' && task_id) {
      const { data: task } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('id', task_id)
        .single();

      if (!task || !task.google_event_id || !task.assigned_to) {
        return new Response(
          JSON.stringify({ message: 'No Google Calendar event to delete' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { accessToken, calendarId } = await getValidAccessToken(supabaseClient, task.assigned_to);

      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${task.google_event_id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action or missing parameters');
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});