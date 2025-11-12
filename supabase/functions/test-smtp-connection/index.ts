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

    // Porta 587 - teste simplificado (STARTTLS não é totalmente suportado)
    if (smtpPort === 587) {
      try {
        const conn = await Deno.connect({
          hostname: smtpHost,
          port: smtpPort,
        });

        const buffer = new Uint8Array(1024);
        const n = await conn.read(buffer);
        conn.close();

        if (n && n > 0) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Servidor SMTP respondeu na porta 587. Use o teste de envio de email para validação completa das credenciais.' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error('Servidor não respondeu');
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Falha ao conectar na porta 587: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Porta 465 - SSL direto
    if (smtpPort === 465) {
      try {
        const conn = await Deno.connectTls({
          hostname: smtpHost,
          port: smtpPort,
        });

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        // Ler banner
        const buffer = new Uint8Array(1024);
        const n = await conn.read(buffer);
        if (!n) throw new Error('Nenhuma resposta do servidor');
        
        const banner = decoder.decode(buffer.subarray(0, n));
        console.log('Banner:', banner.trim());

        // EHLO
        await conn.write(encoder.encode(`EHLO ${smtpHost}\r\n`));
        const ehloBuffer = new Uint8Array(1024);
        const ehloN = await conn.read(ehloBuffer);
        if (!ehloN) throw new Error('Erro no comando EHLO');
        
        console.log('EHLO OK');

        // AUTH LOGIN
        await conn.write(encoder.encode('AUTH LOGIN\r\n'));
        const authBuffer = new Uint8Array(1024);
        await conn.read(authBuffer);

        // Username
        await conn.write(encoder.encode(btoa(smtpUser) + '\r\n'));
        const userBuffer = new Uint8Array(1024);
        await conn.read(userBuffer);

        // Password
        await conn.write(encoder.encode(btoa(smtpPassword) + '\r\n'));
        const passBuffer = new Uint8Array(1024);
        const passN = await conn.read(passBuffer);
        
        if (passN) {
          const response = decoder.decode(passBuffer.subarray(0, passN));
          const statusCode = parseInt(response.substring(0, 3));
          
          if (statusCode === 235) {
            await conn.write(encoder.encode('QUIT\r\n'));
            conn.close();
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Conexão SSL/TLS testada com sucesso! Autenticação funcionando na porta 465.' 
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            throw new Error(`Autenticação falhou: ${response.trim()}`);
          }
        } else {
          throw new Error('Nenhuma resposta da autenticação');
        }

        conn.close();
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Falha na conexão SSL/TLS (porta 465): ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Porta 25 ou outras - conexão sem SSL
    try {
      const conn = await Deno.connect({
        hostname: smtpHost,
        port: smtpPort,
      });

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Ler banner
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      if (!n) throw new Error('Nenhuma resposta do servidor');
      
      const banner = decoder.decode(buffer.subarray(0, n));
      console.log('Banner:', banner.trim());

      // EHLO
      await conn.write(encoder.encode(`EHLO ${smtpHost}\r\n`));
      const ehloBuffer = new Uint8Array(1024);
      const ehloN = await conn.read(ehloBuffer);
      if (!ehloN) throw new Error('Erro no comando EHLO');

      // AUTH LOGIN
      await conn.write(encoder.encode('AUTH LOGIN\r\n'));
      const authBuffer = new Uint8Array(1024);
      await conn.read(authBuffer);

      // Username
      await conn.write(encoder.encode(btoa(smtpUser) + '\r\n'));
      const userBuffer = new Uint8Array(1024);
      await conn.read(userBuffer);

      // Password
      await conn.write(encoder.encode(btoa(smtpPassword) + '\r\n'));
      const passBuffer = new Uint8Array(1024);
      const passN = await conn.read(passBuffer);
      
      if (passN) {
        const response = decoder.decode(passBuffer.subarray(0, passN));
        const statusCode = parseInt(response.substring(0, 3));
        
        if (statusCode === 235) {
          await conn.write(encoder.encode('QUIT\r\n'));
          conn.close();
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Conexão SMTP testada com sucesso! Autenticação funcionando.' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error(`Autenticação falhou: ${response.trim()}`);
        }
      } else {
        throw new Error('Nenhuma resposta da autenticação');
      }

      conn.close();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Falha na conexão SMTP: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
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
