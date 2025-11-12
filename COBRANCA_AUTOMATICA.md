# Sistema de Cobrança Automatizada

## 📋 Visão Geral

Sistema completo de lembretes de pagamento automatizados para contas em atraso, com templates escalonados, integração com Asaas, e envio via email e WhatsApp.

## ✨ Recursos Implementados

### 1. **Tabelas do Banco de Dados**
- `payment_reminder_templates`: Armazena templates de mensagens escalonados por dias de atraso
- `payment_reminder_logs`: Histórico completo de todos os lembretes enviados

### 2. **Edge Function: `send-payment-reminders`**
Função automatizada que:
- Busca contas a receber vencidas
- Calcula dias de atraso
- Aplica o template apropriado baseado no atraso
- Busca links de pagamento do Asaas (se disponível)
- Substitui variáveis dinâmicas no template
- Envia via email e/ou WhatsApp
- Registra todos os envios no histórico
- Evita envios duplicados (intervalo de 7 dias)

### 3. **Componentes Frontend**

#### **PaymentReminderTemplates** (Configurações)
- Gestão completa de templates
- Editor visual com preview em tempo real
- Configuração de canais (email/WhatsApp)
- Definição de tons (amigável, neutro, firme, urgente)
- Suporte a variáveis dinâmicas
- Ativação/desativação de templates

#### **PaymentReminderHistory** (Financeiro)
- Histórico completo de lembretes enviados
- Estatísticas de envio (total, sucesso, falhas)
- Filtros por status, canal e cliente
- Visualização detalhada de cada envio
- Identificação de erros

### 4. **Templates Padrão Incluídos**
- **5 dias** - Tom amigável 😊
- **15 dias** - Tom neutro 📋
- **30 dias** - Tom firme ⚠️
- **60 dias** - Tom urgente/legal 🚨

## 🔧 Configuração do Cron Job

Para ativar o envio automático diário, execute este SQL no Supabase SQL Editor:

```sql
-- Agendar execução diária às 9h da manhã
SELECT cron.schedule(
  'send-payment-reminders-daily',
  '0 9 * * *', -- Todo dia às 9h (horário UTC)
  $$
  SELECT net.http_post(
    url:='https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-payment-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Verificar Jobs Agendados
```sql
-- Ver todos os cron jobs ativos
SELECT * FROM cron.job;
```

### Desativar o Cron Job
```sql
-- Desagendar o job
SELECT cron.unschedule('send-payment-reminders-daily');
```

### Ajustar Horário
O formato do cron é: `minuto hora dia mês dia_da_semana`
- `0 9 * * *` - Todo dia às 9h
- `0 14 * * *` - Todo dia às 14h
- `0 9 * * 1-5` - Segunda a sexta às 9h
- `0 9,18 * * *` - Todo dia às 9h e 18h

**⚠️ IMPORTANTE:** O horário está em UTC. Para Brasil (UTC-3):
- 9h UTC = 6h BRT
- 12h UTC = 9h BRT
- 15h UTC = 12h BRT

## 📊 Variáveis Disponíveis nos Templates

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{client_name}}` | Nome do cliente | João Silva |
| `{{company_name}}` | Nome da empresa | ClientPulse Suite |
| `{{amount}}` | Valor formatado | R$ 1.500,00 |
| `{{amount_number}}` | Valor numérico | 1500.00 |
| `{{description}}` | Descrição da cobrança | Mensalidade Janeiro |
| `{{due_date}}` | Data de vencimento | 15/01/2025 |
| `{{days_overdue}}` | Dias em atraso | 15 |
| `{{invoice_number}}` | Número da fatura | REC-abc123 |
| `{{payment_link}}` | Link de pagamento Asaas | https://... |

## 🎯 Como Usar

### 1. Criar/Editar Templates
1. Vá em **Configurações** > **Lembretes de Cobrança**
2. Clique em **Novo Template**
3. Configure:
   - Nome e descrição
   - Dias de atraso (quando será enviado)
   - Tom da mensagem
   - Canais (email/WhatsApp)
   - Mensagem com variáveis
4. Use o botão **Preview** para visualizar
5. Salve e ative o template

### 2. Monitorar Envios
1. Vá em **Financeiro** > **Histórico de Lembretes**
2. Visualize estatísticas e logs
3. Filtre por status, canal ou cliente
4. Identifique problemas nos envios

### 3. Teste Manual
Para testar a função sem esperar o cron:
```bash
# Via Supabase Dashboard
# Functions > send-payment-reminders > Invoke function
# Ou via curl:
curl -X POST 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-payment-reminders' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

## 🔒 Segurança e Boas Práticas

### Proteção Contra Spam
- Intervalo mínimo de 7 dias entre lembretes do mesmo template
- Verificação de registros duplicados
- Log completo de todos os envios

### Validações
- ✅ Cliente tem email/telefone válido
- ✅ Template está ativo
- ✅ Conta está realmente em atraso
- ✅ Link de pagamento disponível (quando necessário)

### LGPD
- Cliente pode ser excluído da cobrança automática (futuro)
- Histórico auditável de todos os contatos
- Dados sensíveis protegidos por RLS

## 📈 Métricas e Analytics (Futuro)

Possíveis melhorias:
- Taxa de conversão por template
- Tempo médio até pagamento
- Efetividade email vs WhatsApp
- Melhor dia/horário para envio
- Cliente mais responsivo

## 🛠️ Troubleshooting

### Lembretes não estão sendo enviados
1. Verifique se o cron job está ativo: `SELECT * FROM cron.job`
2. Verifique logs da edge function: Supabase Dashboard > Functions > send-payment-reminders > Logs
3. Confirme que existem contas em atraso: `SELECT * FROM accounts_receivable WHERE status = 'overdue'`
4. Verifique templates ativos: `SELECT * FROM payment_reminder_templates WHERE is_active = true`

### Email não chegou
1. Verifique configuração SMTP em **Configurações** > **Integrações** > **Email**
2. Verifique logs: `SELECT * FROM payment_reminder_logs WHERE channel = 'email' ORDER BY sent_at DESC`
3. Confirme que cliente tem email válido

### WhatsApp não enviou
1. Verifique status da conexão WhatsApp
2. Verifique se cliente tem telefone no formato correto
3. Veja logs de erro: `SELECT * FROM payment_reminder_logs WHERE status = 'failed' AND channel = 'whatsapp'`

### Link de pagamento não aparece
1. Verifique se conta tem `asaas_payment_id` preenchido
2. Verifique configuração Asaas em **Configurações** > **Asaas**
3. Template está configurado com `include_payment_link = true`?

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs da edge function
2. Consulte o histórico de lembretes
3. Verifique se o cron job está agendado corretamente
4. Teste manualmente a edge function

## 🚀 Próximos Passos

Sugestões de melhorias:
- [ ] Dashboard com métricas de conversão
- [ ] A/B testing de templates
- [ ] Configuração de horários por cliente
- [ ] Múltiplos lembretes no mesmo dia
- [ ] Integração com SMS (além de email/WhatsApp)
- [ ] Templates condicionais (baseado em valor, cliente VIP, etc)
- [ ] Escalonamento automático de tom
- [ ] Notificações para admins sobre falhas
- [ ] Relatório semanal de cobranças
