import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Mode = 'cnpj' | 'cep';

export function CnpjCepTool() {
  const [mode, setMode] = useState<Mode>('cnpj');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [notFound, setNotFound] = useState(false);

  const search = async () => {
    const digits = value.replace(/\D/g, '');
    if (mode === 'cnpj' && digits.length !== 14) {
      toast({ title: 'CNPJ inválido', description: 'Digite os 14 números do CNPJ.', variant: 'destructive' });
      return;
    }
    if (mode === 'cep' && digits.length !== 8) {
      toast({ title: 'CEP inválido', description: 'Digite os 8 números do CEP.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResult(null);
    setNotFound(false);
    try {
      const url =
        mode === 'cnpj'
          ? `https://brasilapi.com.br/api/cnpj/v1/${digits}`
          : `https://brasilapi.com.br/api/cep/v2/${digits}`;
      const res = await fetch(url);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const d = await res.json();
      if (mode === 'cnpj') {
        setResult({
          'Razão social': d.razao_social || '—',
          'Nome fantasia': d.nome_fantasia || '—',
          Situação: d.descricao_situacao_cadastral || '—',
          Abertura: d.data_inicio_atividade || '—',
          Atividade: d.cnae_fiscal_descricao || '—',
          Telefone: d.ddd_telefone_1 || '—',
          Email: d.email || '—',
          Endereço: [d.logradouro, d.numero, d.bairro, d.municipio, d.uf].filter(Boolean).join(', ') || '—',
          CEP: d.cep || '—',
        });
      } else {
        setResult({
          CEP: d.cep || '—',
          Rua: d.street || '—',
          Bairro: d.neighborhood || '—',
          Cidade: d.city || '—',
          Estado: d.state || '—',
        });
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setValue('');
    setResult(null);
    setNotFound(false);
  };

  const copyAll = () => {
    if (!result) return;
    const text = Object.entries(result).map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border p-1 bg-muted/40">
        {(['cnpj', 'cep'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">{mode === 'cnpj' ? 'CNPJ da empresa' : 'CEP'}</Label>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder={mode === 'cnpj' ? '00.000.000/0000-00' : '00000-000'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {notFound && (
        <div className="rounded-xl border bg-muted/40 p-5 text-center text-sm text-muted-foreground">
          Nenhum resultado encontrado. Confira o número digitado.
        </div>
      )}

      {result && (
        <div className="rounded-xl border bg-muted/40 p-5 space-y-2.5">
          <div className="flex justify-end -mt-1 -mr-1">
            <Button variant="ghost" size="sm" onClick={copyAll}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar tudo
            </Button>
          </div>
          {Object.entries(result).map(([k, v]) => (
            <div key={k} className="flex flex-col sm:flex-row sm:justify-between gap-0.5 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium sm:text-right sm:max-w-[60%] break-words">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
