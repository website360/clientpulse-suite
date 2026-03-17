#!/bin/bash

# Script de Deploy - Sincronização de Emails
# Execute este script após fazer login no Supabase

echo "🚀 Iniciando deploy do backend de emails..."
echo ""

# 1. Linkar ao projeto
echo "📡 Linkando ao projeto Supabase..."
supabase link --project-ref pjnbsuwkxzxcfaetywjs

if [ $? -ne 0 ]; then
    echo "❌ Erro ao linkar projeto. Verifique se você está logado."
    echo "Execute: supabase login"
    exit 1
fi

echo "✅ Projeto linkado com sucesso!"
echo ""

# 2. Aplicar migration
echo "📊 Aplicando migration do banco de dados..."
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Erro ao aplicar migration."
    exit 1
fi

echo "✅ Migration aplicada com sucesso!"
echo ""

# 3. Deploy da Edge Function
echo "⚡ Fazendo deploy da Edge Function..."
supabase functions deploy sync-emails

if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer deploy da função."
    exit 1
fi

echo "✅ Edge Function deployada com sucesso!"
echo ""

# 4. Verificar deploy
echo "🔍 Verificando funções deployadas..."
supabase functions list

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "1. Teste a sincronização no Dashboard Supabase"
echo "2. Verifique as mensagens no banco de dados"
echo "3. Configure polling automático no frontend"
