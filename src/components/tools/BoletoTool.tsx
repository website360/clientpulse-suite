import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function num(v: string): number {
  const n = parseFloat((v || '0').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function parseMoney(v: string): number {
  if (!v) return 0;
  // Aceita "1.234,56" ou "1234.56" ou "1234,56"
  const cleaned = v.replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const d1 = new Date(start + 'T00:00:00');
  const d2 = new Date(end + 'T00:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

interface Boleto {
  id: number;
  valor: string;
  vencimento: string;
}

export function BoletoTool() {
  const today = new Date().toISOString().slice(0, 10);
  const idRef = useRef(1);
  const [pagamento, setPagamento] = useState(today);
  const [multaPct, setMultaPct] = useState('5');
  const [jurosDiaPct, setJurosDiaPct] = useState('0,033'); // % ao dia (1% ao mês = limite legal)
  const [boletos, setBoletos] = useState<Boleto[]>([{ id: 0, valor: '', vencimento: '' }]);

  const addBoleto = () =>
    setBoletos((b) => [...b, { id: idRef.current++, valor: '', vencimento: '' }]);
  const removeBoleto = (id: number) =>
    setBoletos((b) => (b.length > 1 ? b.filter((x) => x.id !== id) : b));
  const updateBoleto = (id: number, patch: Partial<Boleto>) =>
    setBoletos((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const calc = useMemo(() => {
    const multaRate = num(multaPct) / 100;
    const jurosRate = num(jurosDiaPct) / 100;

    const rows = boletos.map((bo) => {
      const original = parseMoney(bo.valor);
      const atraso = Math.max(0, daysBetween(bo.vencimento, pagamento));
      const temAtraso = atraso > 0 && original > 0 && !!bo.vencimento;
      const multa = temAtraso ? original * multaRate : 0;
      const juros = temAtraso ? original * jurosRate * atraso : 0;
      const total = original + multa + juros;
      return { ...bo, original, atraso, temAtraso, multa, juros, total, preenchido: original > 0 && !!bo.vencimento };
    });

    const totalOriginal = rows.reduce((s, r) => s + r.original, 0);
    const totalEncargos = rows.reduce((s, r) => s + r.multa + r.juros, 0);
    const totalGeral = rows.reduce((s, r) => s + r.total, 0);
    return { rows, totalOriginal, totalEncargos, totalGeral, algumPreenchido: rows.some((r) => r.preenchido) };
  }, [boletos, pagamento, multaPct, jurosDiaPct]);

  const multi = boletos.length > 1;

  return (
    <div className="space-y-5">
      {/* Configurações compartilhadas */}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Pagamento">
          <Input type="date" value={pagamento} onChange={(e) => setPagamento(e.target.value)} />
        </Field>
        <Field label="Multa (%)" hint="única">
          <Input inputMode="decimal" value={multaPct} onChange={(e) => setMultaPct(e.target.value)} />
        </Field>
        <Field label="Juros (%/dia)" hint="legal: 0,033">
          <Input inputMode="decimal" value={jurosDiaPct} onChange={(e) => setJurosDiaPct(e.target.value)} />
        </Field>
      </div>

      {/* Lista de boletos */}
      <div className="space-y-2.5">
        {calc.rows.map((r, i) => (
          <div key={r.id} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground w-5 flex-shrink-0">{i + 1}</span>
              <Input
                inputMode="decimal"
                placeholder="Valor (ex: 1.500,00)"
                value={r.valor}
                onChange={(e) => updateBoleto(r.id, { valor: e.target.value })}
                className="flex-1"
              />
              <Input
                type="date"
                value={r.vencimento}
                onChange={(e) => updateBoleto(r.id, { vencimento: e.target.value })}
                className="w-[150px] flex-shrink-0"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                onClick={() => removeBoleto(r.id)}
                disabled={boletos.length === 1}
                title="Remover"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {r.preenchido && (
              <div className="flex items-center justify-between text-xs pl-7">
                {r.temAtraso ? (
                  <span className="text-amber-600 dark:text-amber-500 font-medium">
                    {r.atraso} {r.atraso === 1 ? 'dia' : 'dias'} · multa {brl(r.multa)} · juros {brl(r.juros)}
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-500 font-medium">Dentro do prazo</span>
                )}
                <span className="font-semibold">{brl(r.total)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addBoleto} className="w-full">
        <Plus className="h-4 w-4 mr-1.5" /> Adicionar boleto
      </Button>

      {/* Totais */}
      <div className="rounded-xl border bg-muted/40 p-5 space-y-2.5">
        {calc.algumPreenchido ? (
          <>
            <Line label={multi ? 'Soma dos valores originais' : 'Valor original'} value={brl(calc.totalOriginal)} />
            <Line label="Multa + juros" value={brl(calc.totalEncargos)} />
            <div className="border-t pt-2.5 mt-2 flex items-center justify-between">
              <span className="font-semibold">{multi ? `Total (${boletos.length} boletos)` : 'Total a pagar'}</span>
              <span className="text-xl font-bold">{brl(calc.totalGeral)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Preencha valor e vencimento para calcular.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <Label className="text-sm">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
