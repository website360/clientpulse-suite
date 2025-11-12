import { BlockTemplate } from './types';

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    type: 'header-simple',
    name: 'Cabeçalho Simples',
    icon: 'Heading1',
    category: 'Cabeçalho',
    defaultContent: `<div style="background-color: {{bgColor}}; padding: 20px; text-align: center; border-bottom: 3px solid {{borderColor}};">
  <h1 style="margin: 0; color: {{textColor}}; font-size: 24px;">{{title}}</h1>
  <p style="margin: 5px 0 0 0; color: {{subtitleColor}}; font-size: 14px;">{{subtitle}}</p>
</div>`,
    defaultProperties: {
      title: 'Título do Email',
      subtitle: 'Subtítulo ou descrição',
      bgColor: '#f8f9fa',
      borderColor: '#0066cc',
      textColor: '#333333',
      subtitleColor: '#666666',
    },
    editableFields: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'bgColor', label: 'Cor de Fundo', type: 'color' },
      { key: 'borderColor', label: 'Cor da Borda', type: 'color' },
      { key: 'textColor', label: 'Cor do Texto', type: 'color' },
      { key: 'subtitleColor', label: 'Cor do Subtítulo', type: 'color' },
    ],
  },
  {
    type: 'button',
    name: 'Botão',
    icon: 'Square',
    category: 'Ação',
    defaultContent: `<table cellpadding="0" cellspacing="0" style="margin: 20px auto;">
  <tr>
    <td style="background-color: {{bgColor}}; padding: 12px 30px; border-radius: 6px; text-align: center;">
      <a href="{{url}}" style="color: {{textColor}}; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        {{text}}
      </a>
    </td>
  </tr>
</table>`,
    defaultProperties: {
      text: 'Clique Aqui',
      url: 'https://exemplo.com',
      bgColor: '#0066cc',
      textColor: '#ffffff',
    },
    editableFields: [
      { key: 'text', label: 'Texto do Botão', type: 'text' },
      { key: 'url', label: 'URL', type: 'url', placeholder: 'https://...' },
      { key: 'bgColor', label: 'Cor de Fundo', type: 'color' },
      { key: 'textColor', label: 'Cor do Texto', type: 'color' },
    ],
  },
  {
    type: 'text',
    name: 'Parágrafo',
    icon: 'Type',
    category: 'Conteúdo',
    defaultContent: `<div style="padding: 20px; color: {{textColor}}; font-size: 14px; line-height: 1.6;">
  <p style="margin: 0;">{{content}}</p>
</div>`,
    defaultProperties: {
      content: 'Digite seu texto aqui...',
      textColor: '#333333',
    },
    editableFields: [
      { key: 'content', label: 'Conteúdo', type: 'textarea' },
      { key: 'textColor', label: 'Cor do Texto', type: 'color' },
    ],
  },
  {
    type: 'info-box',
    name: 'Caixa de Informação',
    icon: 'Info',
    category: 'Conteúdo',
    defaultContent: `<div style="background-color: {{bgColor}}; border-left: 4px solid {{borderColor}}; padding: 15px; margin: 20px; border-radius: 4px;">
  <p style="margin: 0; color: {{textColor}}; font-size: 14px;">
    <strong>{{title}}</strong> {{message}}
  </p>
</div>`,
    defaultProperties: {
      title: '📌 Informação:',
      message: 'Sua mensagem aqui',
      bgColor: '#e0f2fe',
      borderColor: '#0284c7',
      textColor: '#0c4a6e',
    },
    editableFields: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'message', label: 'Mensagem', type: 'textarea' },
      { key: 'bgColor', label: 'Cor de Fundo', type: 'color' },
      { key: 'borderColor', label: 'Cor da Borda', type: 'color' },
      { key: 'textColor', label: 'Cor do Texto', type: 'color' },
    ],
  },
  {
    type: 'divider',
    name: 'Divisor',
    icon: 'Minus',
    category: 'Layout',
    defaultContent: `<hr style="border: none; border-top: 1px solid {{color}}; margin: {{spacing}}px 0;" />`,
    defaultProperties: {
      color: '#e5e7eb',
      spacing: '30',
    },
    editableFields: [
      { key: 'color', label: 'Cor', type: 'color' },
      { key: 'spacing', label: 'Espaçamento (px)', type: 'text' },
    ],
  },
  {
    type: 'spacer',
    name: 'Espaçamento',
    icon: 'MoveVertical',
    category: 'Layout',
    defaultContent: `<div style="height: {{height}}px;"></div>`,
    defaultProperties: {
      height: '30',
    },
    editableFields: [
      { key: 'height', label: 'Altura (px)', type: 'text' },
    ],
  },
  {
    type: 'footer',
    name: 'Rodapé',
    icon: 'PanelBottom',
    category: 'Rodapé',
    defaultContent: `<div style="background-color: {{bgColor}}; padding: 20px; text-align: center; border-top: 2px solid {{borderColor}}; margin-top: 30px;">
  <p style="margin: 0 0 10px 0; color: {{textColor}}; font-size: 12px;">
    {{copyright}}
  </p>
  <p style="margin: 0; color: {{subtextColor}}; font-size: 11px;">
    {{disclaimer}}
  </p>
</div>`,
    defaultProperties: {
      copyright: '© 2024 Sua Empresa. Todos os direitos reservados.',
      disclaimer: 'Este é um email automático, por favor não responda.',
      bgColor: '#f3f4f6',
      borderColor: '#e5e7eb',
      textColor: '#6b7280',
      subtextColor: '#9ca3af',
    },
    editableFields: [
      { key: 'copyright', label: 'Copyright', type: 'text' },
      { key: 'disclaimer', label: 'Aviso', type: 'text' },
      { key: 'bgColor', label: 'Cor de Fundo', type: 'color' },
      { key: 'borderColor', label: 'Cor da Borda', type: 'color' },
      { key: 'textColor', label: 'Cor do Texto', type: 'color' },
      { key: 'subtextColor', label: 'Cor do Subtexto', type: 'color' },
    ],
  },
];
