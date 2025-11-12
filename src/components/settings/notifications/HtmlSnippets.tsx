import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HtmlSnippet {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
}

const SNIPPETS: HtmlSnippet[] = [
  {
    id: 'header-simple',
    name: 'Cabeçalho Simples',
    category: 'Cabeçalho',
    description: 'Cabeçalho com logo e título',
    code: `<div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #0066cc;">
  <h1 style="margin: 0; color: #333; font-size: 24px;">{{client_name}}</h1>
  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Sistema de Gestão</p>
</div>`
  },
  {
    id: 'header-with-logo',
    name: 'Cabeçalho com Logo',
    category: 'Cabeçalho',
    description: 'Cabeçalho profissional com imagem',
    code: `<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-bottom: 2px solid #e5e7eb;">
  <tr>
    <td style="padding: 20px; text-align: center;">
      <img src="https://via.placeholder.com/150x50" alt="Logo" style="max-width: 150px; height: auto;" />
    </td>
  </tr>
</table>`
  },
  {
    id: 'button-primary',
    name: 'Botão Principal',
    category: 'Botão',
    description: 'Botão de ação primária',
    code: `<table cellpadding="0" cellspacing="0" style="margin: 20px auto;">
  <tr>
    <td style="background-color: #0066cc; padding: 12px 30px; border-radius: 6px; text-align: center;">
      <a href="{{ticket_url}}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        Ver Ticket
      </a>
    </td>
  </tr>
</table>`
  },
  {
    id: 'button-secondary',
    name: 'Botão Secundário',
    category: 'Botão',
    description: 'Botão de ação secundária',
    code: `<table cellpadding="0" cellspacing="0" style="margin: 20px auto;">
  <tr>
    <td style="background-color: #f3f4f6; padding: 12px 30px; border-radius: 6px; border: 2px solid #d1d5db; text-align: center;">
      <a href="{{link}}" style="color: #374151; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
        Saiba Mais
      </a>
    </td>
  </tr>
</table>`
  },
  {
    id: 'info-box',
    name: 'Caixa de Informação',
    category: 'Conteúdo',
    description: 'Caixa destacada para informações importantes',
    code: `<div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
    <strong>📌 Informação:</strong> {{message}}
  </p>
</div>`
  },
  {
    id: 'warning-box',
    name: 'Caixa de Aviso',
    category: 'Conteúdo',
    description: 'Caixa de alerta ou aviso',
    code: `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0; color: #92400e; font-size: 14px;">
    <strong>⚠️ Atenção:</strong> {{message}}
  </p>
</div>`
  },
  {
    id: 'success-box',
    name: 'Caixa de Sucesso',
    category: 'Conteúdo',
    description: 'Caixa para mensagens de sucesso',
    code: `<div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0; color: #065f46; font-size: 14px;">
    <strong>✓ Sucesso:</strong> {{message}}
  </p>
</div>`
  },
  {
    id: 'ticket-info',
    name: 'Informações do Ticket',
    category: 'Conteúdo',
    description: 'Card com detalhes do ticket',
    code: `<table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
  <tr>
    <td>
      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">TICKET #{{ticket_number}}</p>
      <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 20px;">{{subject}}</h2>
      <table width="100%" cellpadding="5" cellspacing="0">
        <tr>
          <td style="color: #6b7280; font-size: 14px; width: 30%;">Cliente:</td>
          <td style="color: #111827; font-size: 14px; font-weight: 600;">{{client_name}}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px;">Prioridade:</td>
          <td style="color: #111827; font-size: 14px; font-weight: 600;">{{priority}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
  },
  {
    id: 'footer-simple',
    name: 'Rodapé Simples',
    category: 'Rodapé',
    description: 'Rodapé com informações de contato',
    code: `<div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 2px solid #e5e7eb; margin-top: 30px;">
  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
    © 2024 Sua Empresa. Todos os direitos reservados.
  </p>
  <p style="margin: 0; color: #9ca3af; font-size: 11px;">
    Este é um email automático, por favor não responda.
  </p>
</div>`
  },
  {
    id: 'footer-with-links',
    name: 'Rodapé com Links',
    category: 'Rodapé',
    description: 'Rodapé completo com redes sociais',
    code: `<table width="100%" cellpadding="20" cellspacing="0" style="background-color: #1f2937; color: #ffffff;">
  <tr>
    <td style="text-align: center;">
      <p style="margin: 0 0 15px 0; font-size: 14px;">Siga-nos nas redes sociais</p>
      <div style="margin-bottom: 15px;">
        <a href="#" style="color: #60a5fa; text-decoration: none; margin: 0 10px;">Facebook</a>
        <a href="#" style="color: #60a5fa; text-decoration: none; margin: 0 10px;">Instagram</a>
        <a href="#" style="color: #60a5fa; text-decoration: none; margin: 0 10px;">LinkedIn</a>
      </div>
      <p style="margin: 0; color: #9ca3af; font-size: 11px;">
        © 2024 Sua Empresa | contato@empresa.com.br
      </p>
    </td>
  </tr>
</table>`
  },
  {
    id: 'divider',
    name: 'Divisor',
    category: 'Conteúdo',
    description: 'Linha separadora de conteúdo',
    code: `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />`
  },
  {
    id: 'spacer',
    name: 'Espaçamento',
    category: 'Conteúdo',
    description: 'Espaço vertical entre elementos',
    code: `<div style="height: 30px;"></div>`
  },
];

interface HtmlSnippetsProps {
  onInsert: (code: string) => void;
}

export function HtmlSnippets({ onInsert }: HtmlSnippetsProps) {
  const categories = [...new Set(SNIPPETS.map(s => s.category))];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Code2 className="h-4 w-4 mr-2" />
          Inserir Snippet
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Snippets HTML</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Clique para inserir no editor
          </p>
        </div>
        <ScrollArea className="h-[400px]">
          {categories.map((category) => (
            <div key={category} className="p-3 border-b last:border-0">
              <Badge variant="secondary" className="mb-2 text-xs">
                {category}
              </Badge>
              <div className="space-y-1">
                {SNIPPETS.filter(s => s.category === category).map((snippet) => (
                  <button
                    key={snippet.id}
                    type="button"
                    onClick={() => onInsert(snippet.code)}
                    className="w-full text-left p-2 hover:bg-accent rounded-md transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                          {snippet.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {snippet.description}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
