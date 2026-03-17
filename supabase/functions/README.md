# Supabase Edge Functions - Email Integration

## Configuração

### 1. Aplicar Migration do Banco de Dados

```bash
# Na pasta do projeto
supabase db push
```

Isso criará as tabelas:
- `messages` - Armazena todas as mensagens (email e WhatsApp)
- `message_attachments` - Anexos das mensagens
- `email_sync_status` - Status de sincronização por conta

### 2. Deploy da Edge Function

```bash
# Deploy da função de sincronização de emails
supabase functions deploy sync-emails
```

### 3. Configurar Variáveis de Ambiente

No dashboard do Supabase (Settings > Edge Functions):
- `SUPABASE_URL` - URL do projeto (auto-configurado)
- `SUPABASE_ANON_KEY` - Chave anônima (auto-configurado)

## Como Funciona

### Sincronização de Emails (IMAP)

1. **Frontend chama a função**:
```typescript
const { data } = await supabase.functions.invoke('sync-emails', {
  body: {
    accountId: 'uuid-da-conta',
    password: 'senha-do-email'
  }
})
```

2. **Edge Function**:
   - Conecta ao servidor IMAP
   - Busca emails novos desde a última sincronização
   - Salva no banco de dados
   - Atualiza status de sincronização

3. **Frontend atualiza**:
   - Busca mensagens do banco
   - Exibe na interface

### Fluxo Completo

```
Email Externo → IMAP Server → Edge Function → Supabase DB → Frontend
```

## Próximos Passos

1. **Aplicar migration**: `supabase db push`
2. **Deploy function**: `supabase functions deploy sync-emails`
3. **Implementar polling no frontend** (a cada 5 minutos)
4. **Testar com conta real**

## Segurança

- ✅ RLS (Row Level Security) habilitado
- ✅ Usuários só veem suas próprias mensagens
- ✅ Senha do email não é armazenada (passada apenas na chamada)
- ✅ CORS configurado

## Limitações Atuais

- Sincronização manual (não automática)
- Apenas INBOX (não outras pastas)
- Sem suporte a HTML rico (apenas texto)
- Anexos não baixados automaticamente
