import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Wifi, Receipt, Building2, ShieldCheck, Wrench, ArrowUpRight, Box } from 'lucide-react';
import logoLight from '@/assets/logo-icon-light.png';
import { IpTool } from '@/components/tools/IpTool';
import { BoletoTool } from '@/components/tools/BoletoTool';
import { CnpjCepTool } from '@/components/tools/CnpjCepTool';
import { ValidatorTool } from '@/components/tools/ValidatorTool';
import { Print3DTool } from '@/components/tools/Print3DTool';

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
    description: 'Calcule multa e juros de mora de um ou vários boletos pagos com atraso.',
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
  {
    id: 'print3d',
    title: 'Preço de peças 3D',
    description: 'Calcule o preço de venda de impressões 3D com filamento, energia, taxas e lucro — direto, Shopee e Mercado Livre.',
    icon: Box,
    render: () => <Print3DTool />,
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
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <Helmet>
        <title>Ferramentas · Agência May</title>
        <meta
          name="description"
          content="Ferramentas úteis: descobrir IP, cálculo de boleto em atraso, consulta de CNPJ/CEP, validador e gerador de senhas."
        />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-base font-bold leading-none">Ferramentas</h1>
            <p className="text-xs text-muted-foreground mt-1.5">Utilitários rápidos da Agência May</p>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActive(tool)}
              className="group relative h-full flex flex-col text-left rounded-2xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <tool.icon className="h-[22px] w-[22px]" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <h2 className="font-semibold leading-snug">{tool.title}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{tool.description}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12 flex items-center justify-center gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Mais ferramentas em breve.
        </p>
      </main>

      {/* Tool dialog */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto p-0 gap-0">
          {active && (
            <>
              <DialogHeader className="flex-row items-center gap-3.5 space-y-0 px-6 pt-6 pb-5 border-b pr-12">
                <span className="h-11 w-11 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <active.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-base leading-tight">{active.title}</DialogTitle>
                  <DialogDescription className="text-xs mt-1 leading-snug">{active.description}</DialogDescription>
                </div>
              </DialogHeader>
              <div className="px-6 py-6">{active.render()}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
