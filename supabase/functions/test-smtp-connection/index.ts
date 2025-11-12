import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMTPTestRequest {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword }: SMTPTestRequest = await req.json();

    console.log(`Testing SMTP connection to ${smtpHost}:${smtpPort}`);

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Todos os campos são obrigatórios para testar a conexão' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Conectar ao servidor SMTP
    const conn = await Deno.connect({
      hostname: smtpHost,
      port: smtpPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper para ler resposta
    const readResponse = async () => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      if (n === null) throw new Error('Conexão fechada pelo servidor');
      const response = decoder.decode(buffer.subarray(0, n));
      console.log('< Response:', response.trim());
      return response;
    };

    // Helper para enviar comando
    const sendCommand = async (command: string) => {
      console.log('> Command:', command);
      await conn.write(encoder.encode(command + '\r\n'));
      const response = await readResponse();
      
      // Verificar se a resposta é um erro (código 4xx ou 5xx)
      const statusCode = parseInt(response.substring(0, 3));
      if (statusCode >= 400) {
        throw new Error(`Erro SMTP: ${response.trim()}`);
      }
      
      return response;
    };

    try {
      // Banner do servidor
      const banner = await readResponse();
      console.log('Server banner:', banner.trim());

      // EHLO
      await sendCommand(`EHLO ${smtpHost}`);

      // STARTTLS se porta 587
      if (smtpPort === 587) {
        await sendCommand('STARTTLS');
        conn.close();
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'STARTTLS não é totalmente suportado nesta implementação. Use porta 465 (SSL) ou 25 (sem criptografia) para teste.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // AUTH LOGIN
      await sendCommand('AUTH LOGIN');
      await sendCommand(btoa(smtpUser));
      await sendCommand(btoa(smtpPassword));

      console.log('SMTP authentication successful');

      // QUIT
      await sendCommand('QUIT');
      conn.close();

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Conexão SMTP testada com sucesso! Autenticação funcionando.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      conn.close();
      console.error('SMTP connection error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Falha na conexão SMTP: ${errorMessage}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in test-smtp-connection function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao testar conexão' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
