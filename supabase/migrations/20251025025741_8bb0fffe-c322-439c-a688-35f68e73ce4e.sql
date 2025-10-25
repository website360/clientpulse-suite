
-- Limpar dados de manutenção para testes

-- Deletar todos os itens de execução de manutenção
DELETE FROM maintenance_execution_items;

-- Deletar todas as execuções de manutenção
DELETE FROM maintenance_executions;

-- Deletar todos os planos de manutenção
DELETE FROM client_maintenance_plans;
