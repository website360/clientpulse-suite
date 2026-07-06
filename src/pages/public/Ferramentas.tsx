import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wifi, Receipt, Building2, ShieldCheck, Wrench } from 'lucide-react';
import logoLight from '@/assets/logo-icon-light.png';
import { IpTool } from '@/components/tools/IpTool';
import { BoletoTool } from '@/components/tools/BoletoTool';
import { CnpjCepTool } from '@/components/tools/CnpjCepTool';
import { ValidatorTool } from '@/components/tools/ValidatorTool';

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  render: () => JSX.Element;
}

const TOOLS: Tool[] = [
  {
    id: 'ip',
    title: 'Descobrir meu IP',
    description: 'Veja seu IP público e a localização aproximada da sua conexão.',
    icon: Wifi,
    render: () => <IpTool />,
  },
  {
    id: 'boleto',
    title: 'Cálculo de boleto em atraso',
    description: 'Calcule multa e juros de mora de um boleto pago com atraso.',
    icon: Receipt,
    render: () => <BoletoTool />,
  },
  {
    id: 'cnpj-cep',
    title: 'Consulta CNPJ / CEP',
    description: 'Busque dados de uma empresa pelo CNPJ ou um endereço pelo CEP.',
    icon: Building2,
    render: () => <CnpjCepTool />,
  },
  {
    id: 'validador',
    title: 'Validador & Senha',
    description: 'Valide CPF/CNPJ e gere senhas fortes na hora.',
    icon: ShieldCheck,
    render: () => <ValidatorTool />,
  },
];

export default function Ferramentas() {
  const [active, setActive] = useState<Tool | null>(null);
  const [logo, setLogo] = useState<string>(logoLight);

  useEffect(() => {
    const loadLogo = async () => {
      const { loadBrandingUrl } = await import('@/lib/branding');
      const url = await loadBrandingUrl('logo-icon-light', logoLight);
      setLogo(url);
    };
    loadLogo();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Ferramentas · Agência May</title>
        <meta
          name="description"
          content="Ferramentas úteis: descobrir IP, cálculo de boleto em atraso, consulta de CNPJ/CEP, validador e gerador de senhas."
        />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-lg font-bold leading-none">Ferramentas</h1>
            <p className="text-xs text-muted-foreground mt-1">Utilitários rápidos da Agência May</p>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActive(tool)}
              className="group h-full text-left rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <tool.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">{tool.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10 flex items-center justify-center gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Mais ferramentas em breve.
        </p>
      </main>

      {/* Tool dialog */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <span className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <active.icon className="h-5 w-5" />
                  </span>
                  {active.title}
                </DialogTitle>
              </DialogHeader>
              <div className="pt-2">{active.render()}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
