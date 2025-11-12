-- Corrigir função para adicionar search_path
CREATE OR REPLACE FUNCTION format_timestamp_br(ts TIMESTAMP WITH TIME ZONE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN TO_CHAR(ts AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY às HH24:MI');
END;
$$;