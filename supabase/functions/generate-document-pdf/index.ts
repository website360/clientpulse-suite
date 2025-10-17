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

    const { template_id, client_id, contract_id, variables_data } = await req.json();

    if (!template_id || !client_id || !variables_data) {
      throw new Error('template_id, client_id e variables_data são obrigatórios');
    }

    // Buscar template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template não encontrado');
    }

    // Processar HTML substituindo variáveis
    let processedHtml = template.template_html;
    const variablesObj = typeof variables_data === 'string' 
      ? JSON.parse(variables_data) 
      : variables_data;

    Object.keys(variablesObj).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processedHtml = processedHtml.replace(regex, variablesObj[key] || '');
    });

    // Criar HTML completo com estilos
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              size: ${template.paper_size || 'A4'};
              margin: 2cm;
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            ${template.styles || ''}
          </style>
        </head>
        <body>
          ${template.header_image_url ? `<img src="${template.header_image_url}" style="width: 100%; margin-bottom: 20px;">` : ''}
          ${processedHtml}
          ${template.footer_image_url ? `<img src="${template.footer_image_url}" style="width: 100%; margin-top: 20px;">` : ''}
        </body>
      </html>
    `;

    // Converter HTML para PDF usando API externa (puppeteer-like service)
    // Por enquanto, vamos apenas salvar o HTML e retornar a URL
    const fileName = `${template.document_type}_${client_id}_${Date.now()}.html`;
    const filePath = `documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('generated-documents')
      .upload(filePath, fullHtml, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('generated-documents')
      .getPublicUrl(filePath);

    // Criar registro do documento gerado
    const { data: generatedDoc, error: docError } = await supabase
      .from('generated_documents')
      .insert({
        template_id,
        client_id,
        contract_id,
        document_type: template.document_type,
        variables_data: variablesObj,
        generated_pdf_url: urlData.publicUrl,
        document_name: `${template.name} - ${Date.now()}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (docError) {
      throw docError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_id: generatedDoc.id,
        pdf_url: urlData.publicUrl,
        html: fullHtml,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
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
