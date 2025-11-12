-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Agendar execução diária da edge function send-payment-reminders
-- Horário: 12h UTC = 9h BRT (Brasil, UTC-3)
SELECT cron.schedule(
  'send-payment-reminders-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-payment-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);