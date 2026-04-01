# Configuração de Templates de Mensagens para Macros de Tickets

Este documento descreve como configurar o sistema de templates de mensagens para Macros de Tickets, inspirado no WHMCS.

## 1. Executar Migração SQL

Execute a migração SQL no Supabase SQL Editor:

```sql
-- Arquivo: supabase/migrations/20240401_add_message_templates_to_macros.sql

-- Add new columns to ticket_macros table for message templates
ALTER TABLE ticket_macros
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'text' CHECK (channel IN ('text', 'email', 'whatsapp', 'both')),
ADD COLUMN IF NOT EXISTS email_subject VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_html TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_template TEXT,
ADD COLUMN IF NOT EXISTS template_category VARCHAR(50) DEFAULT 'custom' CHECK (template_category IN ('custom', 'ticket_opened', 'ticket_reply', 'ticket_closed', 'ticket_feedback', 'payment_reminder', 'service_notification'));

-- Add comment to explain the new fields
COMMENT ON COLUMN ticket_macros.channel IS 'Canal de comunicação: text (texto simples), email, whatsapp, ou both (email + whatsapp)';
COMMENT ON COLUMN ticket_macros.email_subject IS 'Assunto do email (apenas para canal email)';
COMMENT ON COLUMN ticket_macros.email_html IS 'Template HTML do email';
COMMENT ON COLUMN ticket_macros.whatsapp_template IS 'Template de mensagem para WhatsApp';
COMMENT ON COLUMN ticket_macros.template_category IS 'Categoria do template para organização';
```

## 2. Funcionalidades Implementadas

### Templates Padrão (baseados no WHMCS)

- **Ticket Aberto**: Notificação quando um novo ticket é criado
- **Resposta ao Ticket**: Notificação de nova resposta no ticket
- **Ticket Fechado**: Notificação de fechamento do ticket
- **Lembrete de Pagamento**: Lembrete de fatura pendente

### Canais de Comunicação

- **Texto Simples**: Mensagem de texto sem formatação
- **Email (HTML)**: Template HTML completo com design profissional
- **WhatsApp**: Mensagem formatada para WhatsApp
- **Email + WhatsApp**: Envio simultâneo nos dois canais

### Variáveis Dinâmicas

O sistema suporta variáveis que são substituídas automaticamente:

**Cliente:**
- `{client_name}` - Nome do cliente
- `{client_email}` - Email do cliente
- `{client_phone}` - Telefone do cliente
- `{client_company}` - Empresa do cliente

**Ticket:**
- `{ticket_number}` - Número do ticket
- `{ticket_subject}` - Assunto do ticket
- `{ticket_message}` - Mensagem do ticket
- `{ticket_status}` - Status do ticket
- `{ticket_priority}` - Prioridade do ticket
- `{ticket_url}` - Link para o ticket
- `{ticket_opened_date}` - Data de abertura
- `{ticket_closed_date}` - Data de fechamento
- `{resolution_time}` - Tempo de resolução

**Departamento:**
- `{department_name}` - Nome do departamento
- `{department_email}` - Email do departamento

**Staff:**
- `{staff_name}` - Nome do atendente
- `{staff_email}` - Email do atendente
- `{reply_message}` - Mensagem de resposta
- `{reply_date}` - Data da resposta

**Empresa:**
- `{company_name}` - Nome da empresa
- `{company_email}` - Email da empresa
- `{company_phone}` - Telefone da empresa
- `{company_website}` - Site da empresa

**Fatura:**
- `{invoice_number}` - Número da fatura
- `{invoice_amount}` - Valor da fatura
- `{invoice_description}` - Descrição da fatura
- `{due_date}` - Data de vencimento
- `{days_until_due}` - Dias até vencimento
- `{payment_url}` - Link de pagamento

**Outros:**
- `{feedback_url}` - Link de avaliação

## 3. Como Usar

### Criar um Novo Template

1. Acesse **Configurações > Macros Tickets**
2. Clique em **Novo Macro**
3. Selecione o **Canal de Comunicação**:
   - Texto Simples
   - Email (HTML)
   - WhatsApp
   - Email + WhatsApp
4. Preencha os campos conforme o canal escolhido
5. Use as **Variáveis Disponíveis** clicando para copiar
6. Visualize o resultado na aba **Preview**
7. Salve o template

### Preview em Tempo Real

O sistema oferece preview em tempo real para:
- **Email**: Renderização completa do HTML com dados de exemplo
- **WhatsApp**: Simulação da interface do WhatsApp
- **Texto**: Preview formatado da mensagem

### Templates Padrão

O sistema vem com templates padrão prontos para uso, baseados nas melhores práticas do WHMCS:
- Design profissional e responsivo
- Cores e layout consistentes
- Formatação adequada para cada canal
- Variáveis pré-configuradas

## 4. Boas Práticas

### Para Email (HTML)

- Use HTML semântico e válido
- Inclua estilos inline para compatibilidade
- Teste em diferentes clientes de email
- Mantenha largura máxima de 600px
- Use cores da identidade visual da empresa

### Para WhatsApp

- Use emojis para melhor comunicação
- Mantenha mensagens concisas
- Use formatação: *negrito*, _itálico_, ~tachado~
- Inclua links curtos e diretos
- Evite mensagens muito longas

### Variáveis

- Sempre teste os templates com dados reais
- Verifique se todas as variáveis estão disponíveis no contexto
- Use fallbacks quando necessário
- Mantenha consistência na nomenclatura

## 5. Próximos Passos

Após executar a migração SQL, o sistema estará pronto para:
1. Criar templates personalizados
2. Usar templates padrão do WHMCS
3. Enviar mensagens por email e WhatsApp
4. Visualizar previews em tempo real
5. Gerenciar templates por departamento

## 6. Suporte

Para dúvidas ou problemas:
- Verifique se a migração SQL foi executada corretamente
- Confirme que os campos foram adicionados à tabela `ticket_macros`
- Teste com templates padrão antes de criar personalizados
