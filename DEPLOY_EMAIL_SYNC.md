# 📧 Deploy - Sincronização de Emails

Guia completo para ativar a sincronização de emails IMAP/SMTP no ClientPulse.

## 📋 Pré-requisitos

- ✅ Projeto Supabase configurado
- ✅ Supabase CLI instalado (`npm install -g supabase`)
- ✅ Conta de email com IMAP/SMTP habilitado

## 🚀 Passo a Passo

### 1. Fazer Login no Supabase

```bash
supabase login
```

### 2. Linkar ao Projeto

```bash
cd "AGENCIA MAY/clientpulse-suite"
supabase link --project-ref SEU_PROJECT_ID
```

**Como encontrar o Project ID:**
- Dashboard Supabase → Settings → General → Reference ID

### 3. Aplicar Migration do Banco de Dados

```bash
supabase db push
```

Isso criará as tabelas:
- ✅ `messages` - Mensagens (email/WhatsApp)
- ✅ `message_attachments` - Anexos
- ✅ `email_sync_status` - Status de sincronização

### 4. Deploy da Edge Function

```bash
supabase functions deploy sync-emails
```

### 5. Verificar Deploy

```bash
supabase functions list
```

Você deve ver:
```
┌─────────────┬────────┬─────────────────┐
│ NAME        │ STATUS │ UPDATED         │
├─────────────┼────────┼─────────────────┤
│ sync-emails │ ACTIVE │ 2026-03-16 ...  │
└─────────────┴────────┴─────────────────┘
```

## 🧪 Testar Sincronização

### Opção 1: Via Dashboard Supabase

1. Vá para **Edge Functions** → `sync-emails`
2. Clique em **Invoke**
3. Cole o JSON:
```json
{
  "accountId": "uuid-da-conta",
  "password": "sua-senha-email"
}
```
4. Clique em **Send Request**

### Opção 2: Via Frontend

A sincronização será automática quando você:
1. Conectar uma conta IMAP no painel
2. Clicar no botão "Sincronizar" (será adicionado)
3. Aguardar polling automático (a cada 5 minutos)

## 📊 Verificar Dados no Banco

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

## ⚙️ Configurações Importantes

### Variáveis de Ambiente (Auto-configuradas)

No Supabase Dashboard → Settings → Edge Functions:
- `SUPABASE_URL` ✅ (automático)
- `SUPABASE_ANON_KEY` ✅ (automático)

### Segurança

- ✅ RLS habilitado - usuários só veem suas mensagens
- ✅ Senha não armazenada - passada apenas na chamada
- ✅ CORS configurado para seu domínio

## 🔧 Troubleshooting

### Erro: "Account not found"
- Verifique se a conta existe na tabela `message_accounts`
- Confirme que o `accountId` está correto

### Erro: "IMAP connection failed"
- Verifique servidor IMAP e porta
- Confirme que IMAP está habilitado na conta
- Teste credenciais em outro cliente de email

### Erro: "Permission denied"
- Verifique políticas RLS no Supabase
- Confirme que o usuário está autenticado

### Mensagens não aparecem no frontend
- Verifique se a migration foi aplicada
- Confirme que a Edge Function foi deployada
- Teste a query SQL diretamente no Supabase

## 📱 Próximos Passos

Após o deploy:

1. ✅ **Testar sincronização** com uma conta real
2. ✅ **Adicionar botão de sync manual** no frontend
3. ✅ **Implementar polling automático** (a cada 5 min)
4. ⏳ **Criar Edge Function para SMTP** (envio de emails)
5. ⏳ **Adicionar suporte a anexos**
6. ⏳ **Implementar WhatsApp Business API**

## 📞 Suporte

Se encontrar problemas:
1. Verifique logs: `supabase functions logs sync-emails`
2. Teste SQL queries no Supabase Dashboard
3. Revise as políticas RLS
4. Confirme que a migration foi aplicada

## 🎯 Status Atual

- ✅ Schema do banco de dados
- ✅ Edge Function IMAP (sync-emails)
- ✅ Hooks React (useEmailSync)
- ✅ Serviço de sincronização (email-sync.ts)
- ⏳ Integração completa no frontend
- ⏳ Edge Function SMTP (envio)
- ⏳ WhatsApp Business API

---

**Última atualização:** 16/03/2026
