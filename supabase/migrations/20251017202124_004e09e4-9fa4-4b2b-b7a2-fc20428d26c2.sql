-- Etapa 2: Adicionar campos avançados à tabela document_templates
ALTER TABLE document_templates 
  ADD COLUMN IF NOT EXISTS page_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS page_layouts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS styles TEXT,
  ADD COLUMN IF NOT EXISTS paper_size VARCHAR(20) DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT 'portrait';

-- Comentários explicativos
COMMENT ON COLUMN document_templates.page_count IS 'Número total de páginas do template';
COMMENT ON COLUMN document_templates.page_layouts IS 'Array com configuração de cada página (background, margens, etc)';
COMMENT ON COLUMN document_templates.styles IS 'CSS customizado para o template';
COMMENT ON COLUMN document_templates.paper_size IS 'Tamanho do papel: A4, Letter, Legal';
COMMENT ON COLUMN document_templates.orientation IS 'Orientação: portrait ou landscape';