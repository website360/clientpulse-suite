import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code, Copy } from 'lucide-react';
import { useToast, toastSuccess } from '@/hooks/use-toast';

interface HtmlSnippet {
  name: string;
  category: string;
  code: string;
}

const HTML_SNIPPETS: HtmlSnippet[] = [
  {
    name: 'Botão Primário',
    category: 'Botões',
    code: `<a href="#" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Clique Aqui</a>`,
  },
  {
    name: 'Botão Secundário',
    category: 'Botões',
    code: `<a href="#" style="display: inline-block; background-color: transparent; color: #0066cc; padding: 12px 24px; text-decoration: none; border: 2px solid #0066cc; border-radius: 6px; font-weight: bold;">Saiba Mais</a>`,
  },
  {
    name: 'Caixa de Informação',
    category: 'Caixas',
    code: `<div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 16px; border-radius: 4px; margin: 16px 0;">
  <p style="margin: 0; color: #0c4a6e;"><strong>💡 Informação:</strong> Sua mensagem aqui</p>
</div>`,
  },
  {
    name: 'Caixa de Aviso',
    category: 'Caixas',
    code: `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 16px 0;">
  <p style="margin: 0; color: #92400e;"><strong>⚠️ Atenção:</strong> Sua mensagem aqui</p>
</div>`,
  },
  {
    name: 'Caixa de Sucesso',
    category: 'Caixas',
    code: `<div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; border-radius: 4px; margin: 16px 0;">
  <p style="margin: 0; color: #14532d;"><strong>✅ Sucesso:</strong> Sua mensagem aqui</p>
</div>`,
  },
  {
    name: 'Caixa de Erro',
    category: 'Caixas',
    code: `<div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin: 16px 0;">
  <p style="margin: 0; color: #7f1d1d;"><strong>❌ Erro:</strong> Sua mensagem aqui</p>
</div>`,
  },
  {
    name: 'Divisor',
    category: 'Layout',
    code: `<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 24px 0;" />`,
  },
  {
    name: 'Espaçamento',
    category: 'Layout',
    code: `<div style="height: 32px;"></div>`,
  },
  {
    name: 'Imagem com Link',
    category: 'Mídia',
    code: `<a href="https://seu-link.com" target="_blank">
  <img src="URL_DA_IMAGEM" alt="Descrição da imagem" style="max-width: 100%; height: auto; border-radius: 8px;" />
</a>`,
  },
  {
    name: 'Imagem Centralizada',
    category: 'Mídia',
    code: `<div style="text-align: center; margin: 24px 0;">
  <img src="URL_DA_IMAGEM" alt="Descrição da imagem" style="max-width: 100%; height: auto; border-radius: 8px;" />
</div>`,
  },
  {
    name: 'Duas Imagens Lado a Lado',
    category: 'Mídia',
    code: `<div style="display: flex; gap: 16px; margin: 24px 0;">
  <img src="URL_DA_IMAGEM_1" alt="Imagem 1" style="width: 50%; height: auto; border-radius: 8px;" />
  <img src="URL_DA_IMAGEM_2" alt="Imagem 2" style="width: 50%; height: auto; border-radius: 8px;" />
</div>`,
  },
  {
    name: 'Lista com Ícones',
    category: 'Listas',
    code: `<ul style="list-style: none; padding: 0;">
  <li style="padding: 8px 0;">✓ Item 1</li>
  <li style="padding: 8px 0;">✓ Item 2</li>
  <li style="padding: 8px 0;">✓ Item 3</li>
</ul>`,
  },
  {
    name: 'Card Destaque',
    category: 'Cards',
    code: `<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 16px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
  <h3 style="margin-top: 0; color: #1f2937;">Título do Card</h3>
  <p style="color: #6b7280;">Seu conteúdo aqui...</p>
</div>`,
  },
  {
    name: 'Citação',
    category: 'Texto',
    code: `<blockquote style="border-left: 4px solid #d1d5db; padding-left: 16px; margin: 16px 0; font-style: italic; color: #6b7280;">
  "Sua citação aqui..."
</blockquote>`,
  },
  {
    name: 'Código Inline',
    category: 'Texto',
    code: `<code style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #1f2937;">seu código</code>`,
  },
  {
    name: 'Bloco de Código',
    category: 'Texto',
    code: `<pre style="background-color: #1f2937; color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto;"><code>// Seu código aqui
function exemplo() {
  console.log("Hello World");
}</code></pre>`,
  },
];

interface HtmlSnippetsProps {
  onInsert: (code: string) => void;
}

export function HtmlSnippets({ onInsert }: HtmlSnippetsProps) {
  const { toast } = useToast();

  const handleCopy = (code: string, name: string) => {
    navigator.clipboard.writeText(code);
    toastSuccess('Copiado', `Snippet "${name}" copiado para área de transferência`);
  };

  const categories = Array.from(new Set(HTML_SNIPPETS.map(s => s.category)));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Code className="h-4 w-4 mr-2" />
          HTML Snippets
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <ScrollArea className="h-96">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Snippets HTML</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Clique para inserir ou copiar
              </p>
              <div className="bg-muted p-2 rounded text-xs space-y-1">
                <p className="font-medium">💡 Para imagens:</p>
                <p>1. Faça upload da imagem</p>
                <p>2. Substitua "URL_DA_IMAGEM"</p>
              </div>
            </div>
            {categories.map((category) => (
              <div key={category}>
                <h5 className="font-medium text-xs text-muted-foreground mb-2">
                  {category}
                </h5>
                <div className="space-y-2">
                  {HTML_SNIPPETS.filter(s => s.category === category).map((snippet, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded border hover:bg-accent cursor-pointer group"
                    >
                      <span
                        className="text-sm flex-1"
                        onClick={() => onInsert(snippet.code)}
                      >
                        {snippet.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(snippet.code, snippet.name);
                        }}
                        type="button"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
