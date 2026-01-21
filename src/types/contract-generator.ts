export interface ContractStyleConfig {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  titleFontSize: number;
  titleBold: boolean;
  paragraphBold: boolean;
  textAlign: 'left' | 'center' | 'justify';
  backgroundImage?: string;
  backgroundOpacity: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export const DEFAULT_STYLE_CONFIG: ContractStyleConfig = {
  fontFamily: 'Times New Roman',
  fontSize: 12,
  lineHeight: 1.8,
  titleFontSize: 14,
  titleBold: true,
  paragraphBold: false,
  textAlign: 'justify',
  backgroundOpacity: 0.1,
  marginTop: 40,
  marginBottom: 40,
  marginLeft: 40,
  marginRight: 40,
};

export interface ContractTemplate {
  id: string;
  name: string;
  serviceType: string;
  description: string;
  content: string;
  fields: ContractField[];
  styleConfig?: ContractStyleConfig;
}

export interface ContractField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency';
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export interface GeneratedContract {
  templateId: string;
  templateName: string;
  clientId?: string;
  clientName: string;
  fields: Record<string, string>;
  content: string;
  generatedAt: Date;
}

// Templates de contratos pré-definidos
export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'website-development',
    name: 'Desenvolvimento de Website',
    serviceType: 'Desenvolvimento Web',
    description: 'Contrato para desenvolvimento de websites institucionais, landing pages e e-commerces',
    fields: [
      { id: 'client_name', name: 'client_name', label: 'Nome do Cliente', type: 'text', required: true, placeholder: 'Nome completo ou razão social' },
      { id: 'client_document', name: 'client_document', label: 'CPF/CNPJ', type: 'text', required: true, placeholder: '000.000.000-00' },
      { id: 'client_address', name: 'client_address', label: 'Endereço', type: 'textarea', required: true, placeholder: 'Endereço completo' },
      { id: 'project_name', name: 'project_name', label: 'Nome do Projeto', type: 'text', required: true, placeholder: 'Ex: Website Institucional' },
      { id: 'project_description', name: 'project_description', label: 'Descrição do Projeto', type: 'textarea', required: true, placeholder: 'Descreva o escopo do projeto' },
      { id: 'total_value', name: 'total_value', label: 'Valor Total', type: 'currency', required: true, placeholder: '0,00' },
      { id: 'payment_method', name: 'payment_method', label: 'Forma de Pagamento', type: 'select', required: true, options: [
        { value: 'a_vista', label: 'À Vista' },
        { value: 'parcelado_2x', label: 'Parcelado em 2x' },
        { value: 'parcelado_3x', label: 'Parcelado em 3x' },
        { value: 'entrada_entrega', label: '50% entrada + 50% na entrega' },
      ]},
      { id: 'delivery_days', name: 'delivery_days', label: 'Prazo de Entrega (dias)', type: 'number', required: true, placeholder: '30' },
      { id: 'start_date', name: 'start_date', label: 'Data de Início', type: 'date', required: true },
      { id: 'revisions', name: 'revisions', label: 'Número de Revisões', type: 'number', required: false, defaultValue: '3', placeholder: '3' },
    ],
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE WEBSITE

CONTRATANTE: {{client_name}}, inscrito no CPF/CNPJ sob o nº {{client_document}}, com endereço em {{client_address}}.

CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em [Endereço da Agência].

As partes acima qualificadas celebram o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições a seguir:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de desenvolvimento do projeto "{{project_name}}", conforme especificações abaixo:

{{project_description}}

CLÁUSULA 2ª - DO VALOR E FORMA DE PAGAMENTO
Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor total de R$ {{total_value}}, a ser pago da seguinte forma: {{payment_method}}.

CLÁUSULA 3ª - DO PRAZO
O prazo para execução dos serviços é de {{delivery_days}} dias úteis, contados a partir de {{start_date}}, podendo ser prorrogado mediante acordo entre as partes.

CLÁUSULA 4ª - DAS REVISÕES
Estão incluídas no valor contratado {{revisions}} rodadas de revisões. Revisões adicionais serão cobradas à parte.

CLÁUSULA 5ª - DAS OBRIGAÇÕES DA CONTRATADA
a) Desenvolver o projeto conforme especificações acordadas;
b) Manter a CONTRATANTE informada sobre o andamento do projeto;
c) Entregar o projeto no prazo estipulado;
d) Fornecer suporte técnico por 30 dias após a entrega.

CLÁUSULA 6ª - DAS OBRIGAÇÕES DA CONTRATANTE
a) Fornecer todos os materiais necessários para o desenvolvimento;
b) Efetuar os pagamentos nas datas acordadas;
c) Aprovar as etapas do projeto dentro dos prazos estabelecidos.

CLÁUSULA 7ª - DA RESCISÃO
O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 15 dias, ficando a parte que der causa à rescisão obrigada a indenizar a outra pelos prejuízos causados.

CLÁUSULA 8ª - DO FORO
Fica eleito o foro da comarca de [Cidade] para dirimir quaisquer dúvidas oriundas do presente contrato.

E por estarem assim justas e contratadas, as partes assinam o presente instrumento em duas vias de igual teor e forma.

[Local], [Data]

_______________________________
CONTRATANTE: {{client_name}}

_______________________________
CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA`
  },
  {
    id: 'social-media',
    name: 'Gestão de Redes Sociais',
    serviceType: 'Marketing Digital',
    description: 'Contrato para gestão mensal de redes sociais e criação de conteúdo',
    fields: [
      { id: 'client_name', name: 'client_name', label: 'Nome do Cliente', type: 'text', required: true, placeholder: 'Nome completo ou razão social' },
      { id: 'client_document', name: 'client_document', label: 'CPF/CNPJ', type: 'text', required: true, placeholder: '000.000.000-00' },
      { id: 'client_address', name: 'client_address', label: 'Endereço', type: 'textarea', required: true, placeholder: 'Endereço completo' },
      { id: 'social_networks', name: 'social_networks', label: 'Redes Sociais', type: 'select', required: true, options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'instagram_facebook', label: 'Instagram + Facebook' },
        { value: 'instagram_facebook_linkedin', label: 'Instagram + Facebook + LinkedIn' },
        { value: 'todas', label: 'Todas as redes' },
      ]},
      { id: 'posts_per_week', name: 'posts_per_week', label: 'Posts por Semana', type: 'number', required: true, placeholder: '3' },
      { id: 'stories_per_week', name: 'stories_per_week', label: 'Stories por Semana', type: 'number', required: true, placeholder: '5' },
      { id: 'monthly_value', name: 'monthly_value', label: 'Valor Mensal', type: 'currency', required: true, placeholder: '0,00' },
      { id: 'contract_duration', name: 'contract_duration', label: 'Duração do Contrato', type: 'select', required: true, options: [
        { value: '3_meses', label: '3 meses' },
        { value: '6_meses', label: '6 meses' },
        { value: '12_meses', label: '12 meses' },
      ]},
      { id: 'start_date', name: 'start_date', label: 'Data de Início', type: 'date', required: true },
      { id: 'includes_ads', name: 'includes_ads', label: 'Inclui Gestão de Anúncios', type: 'select', required: true, options: [
        { value: 'sim', label: 'Sim' },
        { value: 'nao', label: 'Não' },
      ]},
    ],
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO DE REDES SOCIAIS

CONTRATANTE: {{client_name}}, inscrito no CPF/CNPJ sob o nº {{client_document}}, com endereço em {{client_address}}.

CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em [Endereço da Agência].

As partes acima qualificadas celebram o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições a seguir:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de gestão de redes sociais, incluindo:
- Redes contempladas: {{social_networks}}
- Quantidade de posts por semana: {{posts_per_week}}
- Quantidade de stories por semana: {{stories_per_week}}
- Gestão de anúncios: {{includes_ads}}

CLÁUSULA 2ª - DO VALOR E FORMA DE PAGAMENTO
Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor mensal de R$ {{monthly_value}}, a ser pago até o dia 10 de cada mês.

CLÁUSULA 3ª - DA VIGÊNCIA
O presente contrato terá vigência de {{contract_duration}}, iniciando em {{start_date}}, podendo ser renovado automaticamente por igual período, salvo manifestação contrária de qualquer das partes com antecedência mínima de 30 dias.

CLÁUSULA 4ª - DOS SERVIÇOS INCLUSOS
a) Criação de conteúdo visual e textual;
b) Programação e publicação de posts;
c) Criação e publicação de stories;
d) Monitoramento de comentários e mensagens;
e) Relatório mensal de desempenho;
f) Reunião mensal de alinhamento.

CLÁUSULA 5ª - DAS OBRIGAÇÕES DA CONTRATANTE
a) Fornecer informações e materiais necessários;
b) Aprovar o calendário editorial em até 48 horas;
c) Efetuar os pagamentos nas datas acordadas;
d) Disponibilizar acesso às redes sociais.

CLÁUSULA 6ª - DA RESCISÃO
O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 dias. Em caso de rescisão antecipada por parte da CONTRATANTE, será devida multa de 20% sobre o valor restante do contrato.

CLÁUSULA 7ª - DO FORO
Fica eleito o foro da comarca de [Cidade] para dirimir quaisquer dúvidas oriundas do presente contrato.

E por estarem assim justas e contratadas, as partes assinam o presente instrumento em duas vias de igual teor e forma.

[Local], [Data]

_______________________________
CONTRATANTE: {{client_name}}

_______________________________
CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA`
  },
  {
    id: 'maintenance',
    name: 'Manutenção de Website',
    serviceType: 'Manutenção',
    description: 'Contrato para manutenção mensal de websites e sistemas',
    fields: [
      { id: 'client_name', name: 'client_name', label: 'Nome do Cliente', type: 'text', required: true, placeholder: 'Nome completo ou razão social' },
      { id: 'client_document', name: 'client_document', label: 'CPF/CNPJ', type: 'text', required: true, placeholder: '000.000.000-00' },
      { id: 'client_address', name: 'client_address', label: 'Endereço', type: 'textarea', required: true, placeholder: 'Endereço completo' },
      { id: 'website_url', name: 'website_url', label: 'URL do Website', type: 'text', required: true, placeholder: 'https://www.exemplo.com.br' },
      { id: 'maintenance_hours', name: 'maintenance_hours', label: 'Horas de Manutenção/Mês', type: 'number', required: true, placeholder: '4' },
      { id: 'monthly_value', name: 'monthly_value', label: 'Valor Mensal', type: 'currency', required: true, placeholder: '0,00' },
      { id: 'extra_hour_value', name: 'extra_hour_value', label: 'Valor Hora Extra', type: 'currency', required: true, placeholder: '0,00' },
      { id: 'contract_duration', name: 'contract_duration', label: 'Duração do Contrato', type: 'select', required: true, options: [
        { value: '6_meses', label: '6 meses' },
        { value: '12_meses', label: '12 meses' },
        { value: 'indeterminado', label: 'Prazo indeterminado' },
      ]},
      { id: 'start_date', name: 'start_date', label: 'Data de Início', type: 'date', required: true },
      { id: 'includes_hosting', name: 'includes_hosting', label: 'Inclui Hospedagem', type: 'select', required: true, options: [
        { value: 'sim', label: 'Sim' },
        { value: 'nao', label: 'Não' },
      ]},
    ],
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO DE WEBSITE

CONTRATANTE: {{client_name}}, inscrito no CPF/CNPJ sob o nº {{client_document}}, com endereço em {{client_address}}.

CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em [Endereço da Agência].

As partes acima qualificadas celebram o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições a seguir:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de manutenção do website: {{website_url}}

CLÁUSULA 2ª - DOS SERVIÇOS
Os serviços de manutenção incluem:
- Horas mensais de manutenção: {{maintenance_hours}} horas
- Hospedagem inclusa: {{includes_hosting}}
- Atualizações de segurança
- Backup semanal do website
- Monitoramento de uptime
- Pequenas alterações de conteúdo
- Correção de bugs

CLÁUSULA 3ª - DO VALOR E FORMA DE PAGAMENTO
Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA:
- Valor mensal: R$ {{monthly_value}}
- Hora extra (além das {{maintenance_hours}} horas contratadas): R$ {{extra_hour_value}}

O pagamento deve ser efetuado até o dia 10 de cada mês.

CLÁUSULA 4ª - DA VIGÊNCIA
O presente contrato terá vigência de {{contract_duration}}, iniciando em {{start_date}}.

CLÁUSULA 5ª - DO SUPORTE
A CONTRATADA oferecerá suporte de segunda a sexta-feira, das 9h às 18h, com tempo de resposta de até 24 horas úteis.

CLÁUSULA 6ª - DAS OBRIGAÇÕES DA CONTRATANTE
a) Efetuar os pagamentos nas datas acordadas;
b) Fornecer acesso administrativo ao website;
c) Comunicar problemas identificados o mais breve possível.

CLÁUSULA 7ª - DA RESCISÃO
O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.

CLÁUSULA 8ª - DO FORO
Fica eleito o foro da comarca de [Cidade] para dirimir quaisquer dúvidas oriundas do presente contrato.

E por estarem assim justas e contratadas, as partes assinam o presente instrumento em duas vias de igual teor e forma.

[Local], [Data]

_______________________________
CONTRATANTE: {{client_name}}

_______________________________
CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA`
  },
  {
    id: 'branding',
    name: 'Identidade Visual / Branding',
    serviceType: 'Design',
    description: 'Contrato para criação de identidade visual e branding',
    fields: [
      { id: 'client_name', name: 'client_name', label: 'Nome do Cliente', type: 'text', required: true, placeholder: 'Nome completo ou razão social' },
      { id: 'client_document', name: 'client_document', label: 'CPF/CNPJ', type: 'text', required: true, placeholder: '000.000.000-00' },
      { id: 'client_address', name: 'client_address', label: 'Endereço', type: 'textarea', required: true, placeholder: 'Endereço completo' },
      { id: 'brand_name', name: 'brand_name', label: 'Nome da Marca', type: 'text', required: true, placeholder: 'Nome da empresa/marca' },
      { id: 'package_type', name: 'package_type', label: 'Pacote de Serviços', type: 'select', required: true, options: [
        { value: 'basic', label: 'Básico (Logo + Paleta de Cores)' },
        { value: 'standard', label: 'Padrão (Logo + Manual Básico + Papelaria)' },
        { value: 'premium', label: 'Premium (Branding Completo + Manual + Aplicações)' },
      ]},
      { id: 'total_value', name: 'total_value', label: 'Valor Total', type: 'currency', required: true, placeholder: '0,00' },
      { id: 'payment_method', name: 'payment_method', label: 'Forma de Pagamento', type: 'select', required: true, options: [
        { value: 'a_vista', label: 'À Vista' },
        { value: 'parcelado_2x', label: 'Parcelado em 2x' },
        { value: 'parcelado_3x', label: 'Parcelado em 3x' },
      ]},
      { id: 'delivery_days', name: 'delivery_days', label: 'Prazo de Entrega (dias)', type: 'number', required: true, placeholder: '15' },
      { id: 'start_date', name: 'start_date', label: 'Data de Início', type: 'date', required: true },
      { id: 'logo_proposals', name: 'logo_proposals', label: 'Propostas de Logo', type: 'number', required: true, defaultValue: '3', placeholder: '3' },
    ],
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE IDENTIDADE VISUAL

CONTRATANTE: {{client_name}}, inscrito no CPF/CNPJ sob o nº {{client_document}}, com endereço em {{client_address}}.

CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em [Endereço da Agência].

As partes acima qualificadas celebram o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições a seguir:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a criação de identidade visual para a marca "{{brand_name}}", no pacote {{package_type}}.

CLÁUSULA 2ª - DOS ENTREGÁVEIS
Conforme o pacote contratado, estão inclusos:
- {{logo_proposals}} propostas de logotipo
- Paleta de cores
- Tipografia
- Manual de identidade visual (conforme pacote)
- Aplicações em papelaria (conforme pacote)

CLÁUSULA 3ª - DO VALOR E FORMA DE PAGAMENTO
Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor total de R$ {{total_value}}, da seguinte forma: {{payment_method}}.

CLÁUSULA 4ª - DO PRAZO
O prazo para entrega é de {{delivery_days}} dias úteis, contados a partir de {{start_date}} e do recebimento do briefing completo.

CLÁUSULA 5ª - DAS REVISÕES
Estão incluídas 2 rodadas de revisões para cada etapa do projeto. Revisões adicionais serão cobradas à parte.

CLÁUSULA 6ª - DA PROPRIEDADE INTELECTUAL
Após a quitação integral do valor contratado, a CONTRATANTE terá a propriedade dos arquivos finais entregues. A CONTRATADA se reserva o direito de utilizar o trabalho em seu portfólio.

CLÁUSULA 7ª - DA RESCISÃO
O contrato poderá ser rescindido por qualquer das partes. Em caso de rescisão após início dos trabalhos, serão cobrados os serviços já executados proporcionalmente.

CLÁUSULA 8ª - DO FORO
Fica eleito o foro da comarca de [Cidade] para dirimir quaisquer dúvidas oriundas do presente contrato.

E por estarem assim justas e contratadas, as partes assinam o presente instrumento em duas vias de igual teor e forma.

[Local], [Data]

_______________________________
CONTRATANTE: {{client_name}}

_______________________________
CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA`
  },
  {
    id: 'seo',
    name: 'SEO e Otimização',
    serviceType: 'Marketing Digital',
    description: 'Contrato para serviços de SEO e otimização de sites para mecanismos de busca',
    fields: [
      { id: 'client_name', name: 'client_name', label: 'Nome do Cliente', type: 'text', required: true, placeholder: 'Nome completo ou razão social' },
      { id: 'client_document', name: 'client_document', label: 'CPF/CNPJ', type: 'text', required: true, placeholder: '000.000.000-00' },
      { id: 'client_address', name: 'client_address', label: 'Endereço', type: 'textarea', required: true, placeholder: 'Endereço completo' },
      { id: 'website_url', name: 'website_url', label: 'URL do Website', type: 'text', required: true, placeholder: 'https://www.exemplo.com.br' },
      { id: 'monthly_value', name: 'monthly_value', label: 'Valor Mensal', type: 'currency', required: true, placeholder: '0,00' },
      { id: 'contract_duration', name: 'contract_duration', label: 'Duração do Contrato', type: 'select', required: true, options: [
        { value: '6_meses', label: '6 meses (mínimo recomendado)' },
        { value: '12_meses', label: '12 meses' },
      ]},
      { id: 'start_date', name: 'start_date', label: 'Data de Início', type: 'date', required: true },
      { id: 'target_keywords', name: 'target_keywords', label: 'Palavras-chave Alvo (quantidade)', type: 'number', required: true, placeholder: '10' },
    ],
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SEO

CONTRATANTE: {{client_name}}, inscrito no CPF/CNPJ sob o nº {{client_document}}, com endereço em {{client_address}}.

CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em [Endereço da Agência].

As partes acima qualificadas celebram o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições a seguir:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de SEO (Search Engine Optimization) para o website: {{website_url}}

CLÁUSULA 2ª - DOS SERVIÇOS
Os serviços de SEO incluem:
- Análise e auditoria técnica do site
- Otimização de {{target_keywords}} palavras-chave
- Otimização on-page (títulos, meta descriptions, headings)
- Criação de estratégia de conteúdo
- Link building
- Relatórios mensais de performance
- Monitoramento de posições no Google

CLÁUSULA 3ª - DO VALOR E FORMA DE PAGAMENTO
Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor mensal de R$ {{monthly_value}}, a ser pago até o dia 10 de cada mês.

CLÁUSULA 4ª - DA VIGÊNCIA
O presente contrato terá vigência de {{contract_duration}}, iniciando em {{start_date}}. SEO é um trabalho de médio/longo prazo e os resultados são progressivos.

CLÁUSULA 5ª - DOS RESULTADOS
A CONTRATADA se compromete a empregar as melhores práticas de SEO, porém não garante posições específicas nos mecanismos de busca, uma vez que estas dependem de algoritmos controlados por terceiros (Google, Bing, etc).

CLÁUSULA 6ª - DAS OBRIGAÇÕES DA CONTRATANTE
a) Fornecer acesso ao site e ferramentas necessárias;
b) Aprovar conteúdos antes da publicação;
c) Efetuar os pagamentos nas datas acordadas.

CLÁUSULA 7ª - DA RESCISÃO
O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.

CLÁUSULA 8ª - DO FORO
Fica eleito o foro da comarca de [Cidade] para dirimir quaisquer dúvidas oriundas do presente contrato.

E por estarem assim justas e contratadas, as partes assinam o presente instrumento em duas vias de igual teor e forma.

[Local], [Data]

_______________________________
CONTRATANTE: {{client_name}}

_______________________________
CONTRATADA: AGÊNCIA MAY COMUNICAÇÃO DIGITAL LTDA`
  },
];
