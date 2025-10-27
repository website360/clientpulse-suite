-- Add start_date field to client_maintenance_plans
ALTER TABLE client_maintenance_plans
ADD COLUMN start_date date;

COMMENT ON COLUMN client_maintenance_plans.start_date IS 'Data da primeira manutenção agendada';