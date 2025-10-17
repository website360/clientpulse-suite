import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { document_id } = await req.json();

    if (!document_id) {
      throw new Error('document_id é obrigatório');
    }

    // Buscar configurações do Clicksign
    const { data: settings, error: settingsError } = await supabase
      .from('clicksign_settings')
      .select('*')
      .single();

    if (settingsError || !settings || !settings.is_active) {
      throw new Error('Clicksign não está configurado ou ativo');
    }

    // Buscar documento gerado
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select('*, clients(*)')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Documento não encontrado');
    }

    // Determinar URL base do Clicksign
    const baseUrl = settings.environment === 'production'
      ? 'https://app.clicksign.com/api/v1'
      : 'https://sandbox.clicksign.com/api/v1';

    // 1. Upload do documento para Clicksign
    const uploadResponse = await fetch(`${baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': settings.api_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: {
          path: document.generated_pdf_url,
          content_base64: null, // Se tiver base64 do PDF, usar aqui
          deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
          auto_close: true,
          locale: 'pt-BR',
          sequence_enabled: false,
        }
      }),
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      throw new Error(`Erro ao enviar documento para Clicksign: ${errorData}`);
    }

    const uploadData = await uploadResponse.json();
    const clicksignDocumentKey = uploadData.document.key;

    // 2. Adicionar signatário (cliente)
    const signerResponse = await fetch(`${baseUrl}/lists`, {
      method: 'POST',
      headers: {
        'Authorization': settings.api_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        list: {
          document_key: clicksignDocumentKey,
          signer: {
            email: document.clients.email,
            name: document.clients.full_name || document.clients.company_name,
            phone_number: document.clients.phone,
            documentation: document.clients.cpf_cnpj,
            birthday: document.clients.birth_date,
            has_documentation: !!document.clients.cpf_cnpj,
          },
          sign_as: 'sign', // 'sign' para assinatura eletrônica
        }
      }),
    });

    if (!signerResponse.ok) {
      const errorData = await signerResponse.text();
      throw new Error(`Erro ao adicionar signatário: ${errorData}`);
    }

    const signerData = await signerResponse.json();

    // Atualizar documento com informações do Clicksign
    const { error: updateError } = await supabase
      .from('generated_documents')
      .update({
        clicksign_document_id: clicksignDocumentKey,
        clicksign_status: 'running',
        clicksign_signed_url: uploadData.document.downloads?.signed_file_url,
      })
      .eq('id', document_id);

    if (updateError) {
      console.error('Error updating document:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        clicksign_document_key: clicksignDocumentKey,
        signer_request_key: signerData.list?.request_signature_key,
        message: 'Documento enviado para assinatura com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending to Clicksign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
