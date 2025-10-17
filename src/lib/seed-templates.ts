import { supabase } from "@/integrations/supabase/client";

export const templateSeeds = {
  contratoHostedagem: {
    name: "Contrato de Prestação de Serviço - Hospedagem",
    description: "Template padrão para contratos de serviços de hospedagem e manutenção de sites",
    document_type: "contract" as const,
    service_id: null,
    page_count: 3,
    paper_size: "A4",
    orientation: "portrait",
    template_html: `
<div class="contract-content">
  <h1 class="contract-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
  
  <section class="contract-section">
    <h2>DAS PARTES</h2>
    <p><strong>CONTRATANTE:</strong> {{contratante_nome}}, CNPJ {{contratante_cnpj}}, 
    com sede em {{contratante_endereco}}, neste ato representado por {{contratante_representante}}, 
    CPF {{contratante_cpf}}.</p>
    
    <p><strong>CONTRATADA:</strong> Sua empresa, CNPJ XX.XXX.XXX/XXXX-XX, 
    com sede em [Seu endereço].</p>
  </section>

  <section class="contract-section">
    <h2>DO OBJETO</h2>
    <p>O presente contrato tem por objeto a prestação de serviços de hospedagem, 
    manutenção e suporte técnico para o website {{site_url}}.</p>
  </section>

  <section class="contract-section">
    <h2>ESPECIFICAÇÕES TÉCNICAS</h2>
    <ul>
      <li><strong>Armazenamento:</strong> {{servidor_ssd}} GB SSD</li>
      <li><strong>Processador:</strong> {{servidor_cpu}}</li>
      <li><strong>Memória RAM:</strong> {{servidor_memoria}} GB</li>
      <li><strong>Transferência:</strong> {{servidor_transferencia}} mensal</li>
      <li><strong>Uptime garantido:</strong> 99.9%</li>
    </ul>
  </section>

  <section class="contract-section">
    <h2>DO VALOR E FORMA DE PAGAMENTO</h2>
    <p>Pelos serviços prestados, o CONTRATANTE pagará à CONTRATADA o valor mensal de 
    <strong>{{valor_mensal}}</strong>, com vencimento todo dia <strong>{{dia_vencimento}}</strong> 
    de cada mês.</p>
    
    <p>O pagamento poderá ser efetuado através de:</p>
    <ul>
      <li>Boleto bancário</li>
      <li>PIX</li>
      <li>Cartão de crédito</li>
    </ul>
  </section>

  <section class="contract-section">
    <h2>DA VIGÊNCIA</h2>
    <p>O presente contrato terá vigência de <strong>{{prazo_vigencia}}</strong>, 
    com início em <strong>{{data_inicio}}</strong>, sendo automaticamente renovado 
    por iguais períodos, salvo manifestação contrária de qualquer das partes com 
    antecedência mínima de 30 (trinta) dias.</p>
  </section>

  <section class="contract-section">
    <h2>DAS RESPONSABILIDADES DA CONTRATADA</h2>
    <ul>
      <li>Garantir a disponibilidade do servidor com uptime mínimo de 99.9%</li>
      <li>Realizar backups diários automáticos</li>
      <li>Fornecer suporte técnico em dias úteis</li>
      <li>Manter os softwares do servidor atualizados</li>
      <li>Monitorar a performance e segurança do site</li>
    </ul>
  </section>

  <section class="contract-section">
    <h2>DAS RESPONSABILIDADES DO CONTRATANTE</h2>
    <ul>
      <li>Efetuar os pagamentos nas datas estabelecidas</li>
      <li>Fornecer informações e acessos necessários para a prestação do serviço</li>
      <li>Não utilizar o serviço para atividades ilícitas</li>
      <li>Respeitar os limites de recursos contratados</li>
    </ul>
  </section>

  <section class="contract-section">
    <h2>DA RESCISÃO</h2>
    <p>O presente contrato poderá ser rescindido por qualquer das partes mediante 
    comunicação prévia com 30 (trinta) dias de antecedência. Em caso de inadimplência 
    superior a 15 (quinze) dias, a CONTRATADA poderá suspender os serviços.</p>
  </section>

  <section class="contract-section">
    <h2>DO FORO</h2>
    <p>As partes elegem o foro da comarca de [Sua cidade] para dirimir quaisquer 
    dúvidas oriundas deste contrato.</p>
  </section>

  <div class="signatures">
    <p>E, por estarem assim justos e contratados, assinam o presente instrumento 
    em duas vias de igual teor e forma.</p>
    
    <div class="signature-block">
      <div class="signature-line">
        <p>_____________________________</p>
        <p><strong>{{contratante_nome}}</strong></p>
        <p>CONTRATANTE</p>
      </div>
      
      <div class="signature-line">
        <p>_____________________________</p>
        <p><strong>Sua Empresa</strong></p>
        <p>CONTRATADA</p>
      </div>
    </div>
    
    <p class="date">{{cidade}}, {{data_assinatura}}</p>
  </div>
</div>
    `,
    styles: `
.contract-content {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #333;
  padding: 40px 60px;
}

.contract-title {
  text-align: center;
  font-size: 16pt;
  font-weight: bold;
  margin-bottom: 30px;
  text-transform: uppercase;
}

.contract-section {
  margin-bottom: 25px;
  page-break-inside: avoid;
}

.contract-section h2 {
  font-size: 13pt;
  font-weight: bold;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.contract-section p {
  text-align: justify;
  margin-bottom: 10px;
}

.contract-section ul {
  margin-left: 20px;
  margin-bottom: 10px;
}

.contract-section li {
  margin-bottom: 8px;
}

.signatures {
  margin-top: 50px;
  page-break-inside: avoid;
}

.signature-block {
  display: flex;
  justify-content: space-around;
  margin-top: 60px;
  margin-bottom: 30px;
}

.signature-line {
  text-align: center;
}

.signature-line p {
  margin: 5px 0;
}

.date {
  text-align: center;
  margin-top: 30px;
}
    `,
    variables: [
      { name: "contratante_nome", label: "Nome do Contratante", type: "text", category: "Cliente" },
      { name: "contratante_cnpj", label: "CNPJ", type: "text", category: "Cliente" },
      { name: "contratante_endereco", label: "Endereço Completo", type: "text", category: "Cliente" },
      { name: "contratante_representante", label: "Representante Legal", type: "text", category: "Cliente" },
      { name: "contratante_cpf", label: "CPF do Representante", type: "text", category: "Cliente" },
      { name: "site_url", label: "URL do Site", type: "text", category: "Técnico" },
      { name: "servidor_ssd", label: "Armazenamento SSD (GB)", type: "text", category: "Técnico" },
      { name: "servidor_cpu", label: "CPU", type: "text", category: "Técnico" },
      { name: "servidor_memoria", label: "Memória RAM (GB)", type: "text", category: "Técnico" },
      { name: "servidor_transferencia", label: "Transferência Mensal", type: "text", category: "Técnico" },
      { name: "valor_mensal", label: "Valor Mensal", type: "currency", category: "Financeiro" },
      { name: "dia_vencimento", label: "Dia do Vencimento", type: "number", category: "Financeiro" },
      { name: "prazo_vigencia", label: "Prazo de Vigência", type: "text", category: "Contrato" },
      { name: "data_inicio", label: "Data de Início", type: "date", category: "Contrato" },
      { name: "cidade", label: "Cidade", type: "text", category: "Contrato" },
      { name: "data_assinatura", label: "Data de Assinatura", type: "date", category: "Contrato" },
    ],
    page_layouts: [
      { page_number: 1, content_margin_top: 50, content_margin_bottom: 50 },
      { page_number: 2, content_margin_top: 50, content_margin_bottom: 50 },
      { page_number: 3, content_margin_top: 50, content_margin_bottom: 50 },
    ],
  },

  propostaLojaVirtual: {
    name: "Proposta Comercial - Loja Virtual",
    description: "Template para propostas de desenvolvimento de e-commerce",
    document_type: "proposal" as const,
    service_id: null,
    page_count: 1,
    paper_size: "A4",
    orientation: "portrait",
    template_html: `
<div class="proposal-content">
  <div class="proposal-header">
    <h1>PROPOSTA COMERCIAL</h1>
    <h2>Desenvolvimento de Loja Virtual</h2>
  </div>

  <section class="proposal-section intro">
    <p>Prezado(a) <strong>{{cliente_nome}}</strong>,</p>
    <p>É com grande satisfação que apresentamos nossa proposta para o desenvolvimento 
    da sua <strong>Loja Virtual</strong>. Nossa solução foi cuidadosamente elaborada para 
    atender às suas necessidades específicas e impulsionar suas vendas online.</p>
  </section>

  <section class="proposal-section">
    <h3>🎯 Objetivo do Projeto</h3>
    <p>{{objetivo_projeto}}</p>
  </section>

  <section class="proposal-section">
    <h3>💻 Funcionalidades Incluídas</h3>
    <ul class="features-list">
      {{funcionalidades}}
    </ul>
  </section>

  <section class="proposal-section">
    <h3>🎨 Design e Experiência</h3>
    <ul>
      <li>Design responsivo (mobile, tablet e desktop)</li>
      <li>Interface intuitiva e moderna</li>
      <li>Otimização para conversão de vendas</li>
      <li>Identidade visual personalizada</li>
    </ul>
  </section>

  <section class="proposal-section">
    <h3>🔧 Tecnologias e Integrações</h3>
    <ul>
      <li><strong>Plataforma:</strong> {{plataforma}}</li>
      <li><strong>Pagamento:</strong> Integração com {{gateway_pagamento}}</li>
      <li><strong>Envio:</strong> Cálculo de frete integrado</li>
      <li><strong>SEO:</strong> Otimização para buscadores</li>
    </ul>
  </section>

  <section class="proposal-section">
    <h3>📅 Cronograma de Entrega</h3>
    <p><strong>Prazo estimado:</strong> {{prazo_entrega}}</p>
    
    <div class="timeline">
      <div class="timeline-item">
        <strong>Fase 1:</strong> Planejamento e Layout ({{fase1_prazo}})
      </div>
      <div class="timeline-item">
        <strong>Fase 2:</strong> Desenvolvimento ({{fase2_prazo}})
      </div>
      <div class="timeline-item">
        <strong>Fase 3:</strong> Testes e Ajustes ({{fase3_prazo}})
      </div>
      <div class="timeline-item">
        <strong>Fase 4:</strong> Lançamento ({{fase4_prazo}})
      </div>
    </div>
  </section>

  <section class="proposal-section investment">
    <h3>💰 Investimento</h3>
    <div class="investment-box">
      <p class="investment-label">Valor do Projeto:</p>
      <p class="investment-value">{{valor_investimento}}</p>
      <p class="investment-details">{{condicoes_pagamento}}</p>
    </div>
  </section>

  <section class="proposal-section">
    <h3>🎁 Bônus Inclusos</h3>
    <ul>
      <li>Treinamento completo da plataforma</li>
      <li>30 dias de suporte pós-lançamento</li>
      <li>Certificado SSL incluído no primeiro ano</li>
      <li>Manual de utilização personalizado</li>
    </ul>
  </section>

  <section class="proposal-section cta">
    <h3>Próximos Passos</h3>
    <p>Para dar início ao projeto, basta aprovar esta proposta e realizar o pagamento 
    da primeira parcela. Nossa equipe entrará em contato imediatamente para agendar 
    a reunião de kickoff.</p>
    
    <p class="validity"><strong>Validade da proposta:</strong> {{validade_proposta}} dias</p>
  </section>

  <footer class="proposal-footer">
    <p>Ficamos à disposição para esclarecer qualquer dúvida.</p>
    <p><strong>Atenciosamente,</strong></p>
    <p>{{nome_empresa}}</p>
    <p>{{contato_empresa}}</p>
  </footer>
</div>
    `,
    styles: `
.proposal-content {
  font-family: 'Arial', sans-serif;
  color: #333;
  padding: 40px 50px;
  line-height: 1.6;
}

.proposal-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 3px solid #4F46E5;
}

.proposal-header h1 {
  font-size: 32pt;
  font-weight: bold;
  color: #4F46E5;
  margin-bottom: 10px;
}

.proposal-header h2 {
  font-size: 18pt;
  color: #64748B;
  font-weight: normal;
}

.proposal-section {
  margin-bottom: 30px;
  page-break-inside: avoid;
}

.proposal-section h3 {
  font-size: 16pt;
  font-weight: bold;
  color: #1E293B;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 2px solid #E2E8F0;
}

.proposal-section p {
  text-align: justify;
  margin-bottom: 12px;
  font-size: 11pt;
}

.proposal-section ul {
  margin-left: 25px;
  margin-bottom: 12px;
}

.proposal-section li {
  margin-bottom: 8px;
  font-size: 11pt;
}

.intro {
  background: #F8FAFC;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #4F46E5;
}

.features-list li {
  list-style-type: none;
  padding-left: 25px;
  position: relative;
}

.features-list li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #10B981;
  font-weight: bold;
}

.timeline {
  background: #F8FAFC;
  padding: 20px;
  border-radius: 8px;
  margin-top: 15px;
}

.timeline-item {
  padding: 10px 0;
  border-left: 3px solid #4F46E5;
  padding-left: 15px;
  margin-bottom: 10px;
}

.investment {
  page-break-inside: avoid;
}

.investment-box {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: white;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  margin: 20px 0;
}

.investment-label {
  font-size: 14pt;
  margin-bottom: 10px;
}

.investment-value {
  font-size: 36pt;
  font-weight: bold;
  margin: 15px 0;
}

.investment-details {
  font-size: 12pt;
  opacity: 0.9;
}

.cta {
  background: #FEF3C7;
  padding: 25px;
  border-radius: 8px;
  border-left: 4px solid #F59E0B;
}

.validity {
  font-style: italic;
  color: #64748B;
  margin-top: 15px;
}

.proposal-footer {
  margin-top: 50px;
  padding-top: 30px;
  border-top: 2px solid #E2E8F0;
  text-align: center;
}

.proposal-footer p {
  margin: 8px 0;
}
    `,
    variables: [
      { name: "cliente_nome", label: "Nome do Cliente", type: "text", category: "Cliente" },
      { name: "objetivo_projeto", label: "Objetivo do Projeto", type: "text", category: "Projeto" },
      { name: "funcionalidades", label: "Lista de Funcionalidades (HTML)", type: "text", category: "Projeto" },
      { name: "plataforma", label: "Plataforma (Ex: WordPress/WooCommerce)", type: "text", category: "Técnico" },
      { name: "gateway_pagamento", label: "Gateway de Pagamento", type: "text", category: "Técnico" },
      { name: "prazo_entrega", label: "Prazo Total de Entrega", type: "text", category: "Projeto" },
      { name: "fase1_prazo", label: "Prazo Fase 1", type: "text", category: "Projeto" },
      { name: "fase2_prazo", label: "Prazo Fase 2", type: "text", category: "Projeto" },
      { name: "fase3_prazo", label: "Prazo Fase 3", type: "text", category: "Projeto" },
      { name: "fase4_prazo", label: "Prazo Fase 4", type: "text", category: "Projeto" },
      { name: "valor_investimento", label: "Valor do Investimento", type: "currency", category: "Financeiro" },
      { name: "condicoes_pagamento", label: "Condições de Pagamento", type: "text", category: "Financeiro" },
      { name: "validade_proposta", label: "Validade da Proposta (dias)", type: "number", category: "Proposta" },
      { name: "nome_empresa", label: "Nome da Empresa", type: "text", category: "Empresa" },
      { name: "contato_empresa", label: "Contato da Empresa", type: "text", category: "Empresa" },
    ],
    page_layouts: [
      { page_number: 1, content_margin_top: 30, content_margin_bottom: 30 },
    ],
  },
};

export async function seedDocumentTemplates() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const templates = Object.values(templateSeeds);
  
  for (const template of templates) {
    const { data: existing } = await supabase
      .from("document_templates")
      .select("id")
      .eq("name", template.name)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase
        .from("document_templates")
        .insert([{
          ...template,
          created_by: user.id,
          is_active: true,
        }]);

      if (error) {
        console.error(`Erro ao criar template ${template.name}:`, error);
      } else {
        console.log(`Template "${template.name}" criado com sucesso!`);
      }
    } else {
      console.log(`Template "${template.name}" já existe.`);
    }
  }
}
