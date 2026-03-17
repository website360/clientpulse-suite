# 🚀 Deploy Backend - Passo a Passo

## ✅ Status Atual
- Supabase CLI instalado (v2.75.0)
- Arquivos criados e prontos para deploy

## 📝 Comandos para Executar

### 1. Login no Supabase
```bash
supabase login
```
- Pressione Enter quando solicitado
- Faça login no navegador que abrir
- Volte ao terminal após login bem-sucedido

### 2. Linkar ao Projeto
```bash
supabase link --project-ref SEU_PROJECT_ID
```

**Como encontrar o Project ID:**
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em Settings → General
4. Copie o "Reference ID"

### 3. Aplicar Migration (Criar Tabelas)
```bash
supabase db push
```

Isso criará:
- ✅ Tabela `messages` (emails e WhatsApp)
- ✅ Tabela `message_attachments` (anexos)
- ✅ Tabela `email_sync_status` (status de sincronização)

### 4. Deploy da Edge Function
```bash
supabase functions deploy sync-emails
```

Isso fará upload da função de sincronização IMAP.

### 5. Verificar Deploy
```bash
supabase functions list
```

Deve mostrar:
```
┌─────────────┬────────┬─────────────────┐
│ NAME        │ STATUS │ UPDATED         │
├─────────────┼────────┼─────────────────┤
│ sync-emails │ ACTIVE │ 2026-03-16 ...  │
└─────────────┴────────┴─────────────────┘
```

## 🧪 Testar Sincronização

### Via Dashboard Supabase
1. Acesse https://supabase.com/dashboard
2. Vá em Edge Functions → `sync-emails`
3. Clique em "Invoke"
4. Cole este JSON:
```json
{
  "accountId": "ID_DA_CONTA",
  "password": "SUA_SENHA_EMAIL"
}
```
5. Clique em "Send Request"

### Verificar Mensagens no Banco
```sql
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;
```

## ⚠️ Importante

**Antes de testar:**
1. Certifique-se de ter uma conta email configurada no sistema
2. Use o ID da conta (pode ver no localStorage do navegador)
3. Use a senha real do email (ou app password para Gmail/Outlook)

## 🔐 Segurança

- ✅ Senha não é armazenada (apenas passada na chamada)
- ✅ RLS habilitado (usuários só veem suas mensagens)
- ✅ SSL/TLS obrigatório (portas 993/465)

## 📊 Próximos Passos (Após Deploy)

1. Testar sincronização com conta real
2. Verificar se emails aparecem no banco
3. Implementar polling automático no frontend
4. Criar Edge Function para envio (SMTP)

---

**Criado em:** 16/03/2026
**Status:** Pronto para deploy
