-- Create a function to calculate 5-minute bucket
CREATE OR REPLACE FUNCTION public.calculate_5min_bucket(ts TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT to_timestamp((extract(epoch from ts)::bigint / 300) * 300);
$$;

-- Add 5-minute deduplication bucket column
ALTER TABLE public.whatsapp_notification_log
ADD COLUMN IF NOT EXISTS bucket_5min TIMESTAMPTZ;

-- Create index for bucket lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_bucket ON public.whatsapp_notification_log (ticket_id, event_type, bucket_5min);

-- Populate bucket for existing rows
UPDATE public.whatsapp_notification_log
SET bucket_5min = public.calculate_5min_bucket(sent_at)
WHERE bucket_5min IS NULL;

-- Create trigger to auto-populate bucket on insert
CREATE OR REPLACE FUNCTION public.populate_whatsapp_log_bucket()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.bucket_5min := public.calculate_5min_bucket(NEW.sent_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_whatsapp_log_bucket ON public.whatsapp_notification_log;
CREATE TRIGGER trg_populate_whatsapp_log_bucket
BEFORE INSERT ON public.whatsapp_notification_log
FOR EACH ROW
EXECUTE FUNCTION public.populate_whatsapp_log_bucket();
