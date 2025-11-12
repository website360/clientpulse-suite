import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderTemplate {
  id: string;
  name: string;
  days_overdue: number;
  channels: string[];
  template_subject: string | null;
  template_body: string;
  include_payment_link: boolean;
  send_to_client: boolean;
  send_to_contacts: boolean;
}

interface OverdueReceivable {
  id: string;
  client_id: string;
  description: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  asaas_payment_id: string | null;
  client: {
    id: string;
    full_name: string | null;
    company_name: string | null;
    email: string;
    phone: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando verificação de cobranças em atraso...');

    // Buscar contas a receber vencidas
    const today = new Date().toISOString().split('T')[0];
    const { data: receivables, error: receivablesError } = await supabase
      .from('accounts_receivable')
      .select(`
        id,
        client_id,
        description,
        amount,
        due_date,
        asaas_payment_id,
        client:clients (
          id,
          full_name,
          company_name,
          email,
          phone
        )
      `)
      .eq('status', 'overdue')
      .lt('due_date', today);

    if (receivablesError) {
      console.error('❌ Erro ao buscar receivables:', receivablesError);
      throw receivablesError;
    }

    if (!receivables || receivables.length === 0) {
      console.log('✅ Nenhuma cobrança em atraso encontrada');
      return new Response(
        JSON.stringify({ message: 'Nenhuma cobrança em atraso', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Encontradas ${receivables.length} cobranças em atraso`);

    // Calcular dias de atraso
    const overdueReceivables: OverdueReceivable[] = receivables.map(r => ({
      ...r,
      client: Array.isArray(r.client) ? r.client[0] : r.client,
      days_overdue: Math.floor(
        (new Date().getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24)
      )
    }));

    // Buscar templates ativos
    const { data: templates, error: templatesError } = await supabase
      .from('payment_reminder_templates')
      .select('*')
      .eq('is_active', true)
      .order('days_overdue', { ascending: true });

    if (templatesError) {
      console.error('❌ Erro ao buscar templates:', templatesError);
      throw templatesError;
    }

    if (!templates || templates.length === 0) {
      console.log('⚠️ Nenhum template ativo encontrado');
      return new Response(
        JSON.stringify({ message: 'Nenhum template ativo', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📝 Encontrados ${templates.length} templates ativos`);

    let totalSent = 0;
    const results = [];

    // Processar cada receivable
    for (const receivable of overdueReceivables) {
      // Encontrar o template apropriado (maior dias_overdue <= dias de atraso atual)
      const applicableTemplates = templates.filter(
        t => t.days_overdue <= receivable.days_overdue
      );
      
      if (applicableTemplates.length === 0) {
        console.log(`⏭️ Nenhum template aplicável para ${receivable.days_overdue} dias de atraso`);
        continue;
      }

      // Pegar o template com maior dias_overdue
      const template = applicableTemplates[applicableTemplates.length - 1];

      // Verificar se já foi enviado lembrete deste template
      const { data: existingLog } = await supabase
        .from('payment_reminder_logs')
        .select('id')
        .eq('receivable_id', receivable.id)
        .eq('template_id', template.id)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 7 dias
        .single();

      if (existingLog) {
        console.log(`⏭️ Lembrete já enviado recentemente para receivable ${receivable.id}`);
        continue;
      }

      // Buscar link de pagamento do Asaas
      let paymentLink = '';
      if (template.include_payment_link && receivable.asaas_payment_id) {
        try {
          const { data: asaasData } = await supabase.functions.invoke('sync-asaas-payment', {
            body: { payment_id: receivable.asaas_payment_id }
          });
          paymentLink = asaasData?.invoiceUrl || '';
        } catch (error) {
          console.warn('⚠️ Erro ao buscar link Asaas:', error);
        }
      }

      // Preparar variáveis do template
      const clientName = receivable.client.company_name || receivable.client.full_name || 'Cliente';
      const variables = {
        client_name: clientName,
        company_name: 'Agência May',
        amount: new Intl.NumberFormat('pt-BR', {
          style: 'currency', 
          currency: 'BRL' 
        }).format(receivable.amount),
        amount_number: receivable.amount.toString(),
        description: receivable.description,
        due_date: new Date(receivable.due_date).toLocaleDateString('pt-BR'),
        days_overdue: receivable.days_overdue.toString(),
        invoice_number: `REC-${receivable.id.slice(0, 8)}`,
        payment_link: paymentLink || 'Entre em contato para obter o link de pagamento',
      };

      // Substituir variáveis no template
      let message = template.template_body;
      let subject = template.template_subject || '';
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, variables[key as keyof typeof variables]);
        subject = subject.replace(regex, variables[key as keyof typeof variables]);
      });

      // Enviar para cada canal
      for (const channel of template.channels) {
        let recipient = '';
        let sent = false;
        let errorMessage = '';

        try {
          if (channel === 'email') {
            recipient = receivable.client.email;
            const { error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                to: recipient,
                subject: subject,
                text: message,
                html: message.replace(/\n/g, '<br>')
              }
            });
            
            if (emailError) throw emailError;
            sent = true;
            console.log(`✅ Email enviado para ${recipient}`);
          } else if (channel === 'whatsapp') {
            recipient = receivable.client.phone;
            if (!recipient) {
              console.log(`⏭️ Cliente sem telefone para WhatsApp`);
              continue;
            }

            const { error: whatsappError } = await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send_message',
                phone: recipient,
                message: message
              }
            });
            
            if (whatsappError) throw whatsappError;
            sent = true;
            console.log(`✅ WhatsApp enviado para ${recipient}`);
          }
        } catch (error: any) {
          console.error(`❌ Erro ao enviar ${channel}:`, error);
          errorMessage = error.message || 'Erro desconhecido';
          sent = false;
        }

        // Registrar log
        const { error: logError } = await supabase
          .from('payment_reminder_logs')
          .insert({
            receivable_id: receivable.id,
            template_id: template.id,
            days_overdue: receivable.days_overdue,
            channel,
            recipient,
            status: sent ? 'sent' : 'failed',
            error_message: errorMessage || null,
            payment_link: paymentLink || null
          });

        if (logError) {
          console.error('❌ Erro ao registrar log:', logError);
        }

        if (sent) {
          totalSent++;
          results.push({
            receivable_id: receivable.id,
            client_name: clientName,
            channel,
            template: template.name,
            status: 'sent'
          });
        }
      }
    }

    console.log(`✅ Processo concluído. Total de lembretes enviados: ${totalSent}`);

    return new Response(
      JSON.stringify({
        message: 'Lembretes processados com sucesso',
        total_sent: totalSent,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
