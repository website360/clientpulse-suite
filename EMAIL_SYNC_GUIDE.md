# 📧 Guia de Uso - Sincronização de Emails

## ✅ Deploy Concluído

**Data**: 16/03/2026  
**Status**: Sistema pronto para uso

### O que foi deployado:
- ✅ Edge Function `sync-emails` (ACTIVE)
- ✅ Tabelas do banco de dados criadas
- ✅ Políticas de segurança (RLS) configuradas
- ✅ Hooks e serviços React implementados

---

## 🚀 Como Usar

### 1. Conectar uma Conta de Email

1. Acesse o painel de Mensagens
2. Clique em **"Conectar Conta"**
3. Selecione **"Adicionar Email"**
4. Escolha o método:
   - **OAuth** (Google/Outlook) - Recomendado
   - **IMAP/SMTP Manual** - Para outros provedores

#### Configuração IMAP/SMTP (Manual)

**Gmail:**
- IMAP: `imap.gmail.com:993` (SSL)
- SMTP: `smtp.gmail.com:465` (SSL)
- Use **App Password** (não a senha normal)

**Outlook:**
- IMAP: `outlook.office365.com:993` (SSL)
- SMTP: `smtp.office365.com:465` (SSL)

**Outros:**
- Consulte seu provedor de email
- Portas padrão: IMAP 993, SMTP 465 (SSL)

### 2. Sincronizar Emails

**Atualmente**: A sincronização é manual via Edge Function.

Para sincronizar emails de uma conta:

```bash
# Via Supabase Dashboard
1. Vá em Edge Functions → sync-emails
2. Clique em "Invoke"
3. Cole o JSON:
{
  "accountId": "UUID_DA_CONTA",
  "password": "SENHA_DO_EMAIL"
}
4. Clique em "Send Request"
```

**Resposta esperada:**
```json
{
  "success": true,
  "messagesCount": 5,
  "lastUid": 12345
}
```

### 3. Visualizar Emails Sincronizados

Após a sincronização:
1. Os emails aparecerão automaticamente no painel
2. Filtrados por conta
3. Ordenados por data (mais recentes primeiro)

---

## 🔧 Funcionalidades Implementadas

### ✅ Frontend
- Interface completa de mensagens
- Conectar/editar/desconectar contas
- Filtrar por conta
- Enviar mensagens (salva localmente)
- Badges de status (verde/vermelho)
- Persistência no localStorage

### ✅ Backend
- Edge Function IMAP (buscar emails)
- Tabelas no banco de dados
- RLS (segurança por usuário)
- Rastreamento de sincronização (UIDs)

### ⏳ Próximas Implementações
- Polling automático (a cada 5 minutos)
- Edge Function SMTP (envio real)
- Suporte a anexos
- WhatsApp Business API
- Notificações em tempo real

---

## 📊 Estrutura do Banco de Dados

### Tabela: `messages`
Armazena todas as mensagens (email e WhatsApp)

**Campos principais:**
- `id` - UUID único
- `account_id` - Conta que recebeu/enviou
- `sender_name` - Nome do remetente
- `sender_email` - Email do remetente
- `subject` - Assunto (emails)
- `content` - Conteúdo da mensagem
- `direction` - 'inbound' ou 'outbound'
- `message_type` - 'email' ou 'whatsapp'
- `is_read` - Lida ou não
- `created_at` - Data/hora

### Tabela: `message_attachments`
Anexos das mensagens

### Tabela: `email_sync_status`
Status de sincronização por conta

---

## 🧪 Testar Sincronização

### Passo 1: Obter ID da Conta

No navegador (Console):
```javascript
// Ver contas conectadas
const accounts = JSON.parse(localStorage.getItem('connectedAccounts'));
console.log(accounts);
```

### Passo 2: Invocar Edge Function

Dashboard Supabase → Edge Functions → sync-emails → Invoke:
```json
{
  "accountId": "3",
  "password": "sua-senha-aqui"
}
```

### Passo 3: Verificar Banco de Dados

SQL Editor:
```sql
-- Ver mensagens sincronizadas
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- Ver status de sincronização
SELECT * FROM email_sync_status;

-- Contar mensagens por conta
SELECT account_id, COUNT(*) as total
FROM messages
GROUP BY account_id;
```

---

## 🔐 Segurança

### Implementado:
- ✅ RLS habilitado em todas as tabelas
- ✅ Usuários só veem suas próprias mensagens
- ✅ Senha não armazenada (passada apenas na chamada)
- ✅ SSL/TLS obrigatório (portas 993/465)
- ✅ JWT verification na Edge Function

### Boas Práticas:
- Use App Passwords (Gmail/Outlook)
- Não compartilhe credenciais
- Revogue tokens não utilizados
- Monitore logs de acesso

---

## 📝 Arquivos Importantes

### Backend
- `supabase/functions/sync-emails/index.ts` - Edge Function IMAP
- `supabase/migrations/20260316_messages_schema.sql` - Schema (não usado)
- `CREATE_TABLES.sql` - SQL executado no dashboard

### Frontend
- `src/lib/email-sync.ts` - Serviço de sincronização
- `src/hooks/useEmailSync.ts` - Hook React
- `src/pages/Messages.tsx` - Interface principal
- `src/components/messages/ConnectEmailDialog.tsx` - Dialog de conexão
- `src/components/messages/EditAccountDialog.tsx` - Dialog de edição

### Documentação
- `DEPLOY_STEPS.md` - Guia de deploy
- `DEPLOY_EMAIL_SYNC.md` - Documentação técnica
- `EMAIL_SYNC_GUIDE.md` - Este arquivo

---

## 🐛 Troubleshooting

### Emails não aparecem após sincronização

**Verifique:**
1. Edge Function retornou sucesso?
2. Banco de dados tem registros? (`SELECT * FROM messages`)
3. RLS está permitindo acesso? (usuário autenticado?)

### Erro de autenticação IMAP

**Soluções:**
- Gmail: Use App Password, não senha normal
- Outlook: Habilite IMAP nas configurações
- Verifique servidor e porta (993 para IMAP)

### Mensagens duplicadas

**Causa**: UID tracking não funcionando  
**Solução**: Verificar tabela `email_sync_status`

---

## 📞 Suporte

**Logs da Edge Function:**
```bash
supabase functions logs sync-emails
```

**Verificar deploy:**
```bash
supabase functions list
```

**Testar conexão:**
Use um cliente de email (Thunderbird, etc.) com as mesmas credenciais

---

**Última atualização:** 16/03/2026  
**Versão:** 1.0.0  
**Status:** Produção
