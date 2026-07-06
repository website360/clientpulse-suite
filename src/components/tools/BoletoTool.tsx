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
    const totalMulta = rows.reduce((s, r) => s + r.multa, 0);
    const totalJuros = rows.reduce((s, r) => s + r.juros, 0);
    const totalGeral = rows.reduce((s, r) => s + r.total, 0);
    return { rows, totalOriginal, totalMulta, totalJuros, totalGeral, algumPreenchido: rows.some((r) => r.preenchido) };
  }, [boletos, pagamento, multaPct, jurosDiaPct]);

  const multi = boletos.length > 1;

  return (
    <div className="space-y-6">
      {/* Configurações compartilhadas */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Parâmetros do cálculo
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Pagamento">
            <Input type="date" value={pagamento} onChange={(e) => setPagamento(e.target.value)} />
          </Field>
          <Field label="Multa">
            <div className="relative">
              <Input inputMode="decimal" value={multaPct} onChange={(e) => setMultaPct(e.target.value)} className="pr-7" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
            </div>
          </Field>
          <Field label="Juros/dia">
            <div className="relative">
              <Input inputMode="decimal" value={jurosDiaPct} onChange={(e) => setJurosDiaPct(e.target.value)} className="pr-7" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
            </div>
          </Field>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Padrão legal: multa 5% e juros 0,033%/dia (1% ao mês).
        </p>
      </section>

      {/* Lista de boletos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {multi ? `Boletos (${boletos.length})` : 'Boleto'}
          </p>
        </div>

        <div className="space-y-2.5">
          {calc.rows.map((r, i) => (
            <div key={r.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <Input
                  inputMode="decimal"
                  placeholder="Valor (R$)"
                  value={r.valor}
                  onChange={(e) => updateBoleto(r.id, { valor: e.target.value })}
                  className="flex-1 min-w-0"
                />
                <Input
                  type="date"
                  value={r.vencimento}
                  onChange={(e) => updateBoleto(r.id, { vencimento: e.target.value })}
                  className="w-[9.5rem] flex-shrink-0"
                  title="Vencimento"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                  onClick={() => removeBoleto(r.id)}
                  disabled={boletos.length === 1}
                  title="Remover"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {r.preenchido && (
                <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
                  {r.temAtraso ? (
                    <span className="text-xs text-muted-foreground">
                      <span className="font-medium text-amber-600 dark:text-amber-500">
                        {r.atraso} {r.atraso === 1 ? 'dia' : 'dias'} em atraso
                      </span>
                      {' · '}multa {brl(r.multa)} · juros {brl(r.juros)}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                      Dentro do prazo
                    </span>
                  )}
                  <span className="text-sm font-semibold whitespace-nowrap">{brl(r.total)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addBoleto} className="w-full border-dashed hover:bg-muted hover:text-foreground hover:border-primary/40">
          <Plus className="h-4 w-4 mr-1.5" /> Adicionar boleto
        </Button>
      </section>

      {/* Totais */}
      <section className="rounded-xl border bg-muted/40 p-5">
        {calc.algumPreenchido ? (
          <div className="space-y-2.5">
            <Line label={multi ? 'Soma dos valores originais' : 'Valor original'} value={brl(calc.totalOriginal)} />
            <Line label="Multa" value={brl(calc.totalMulta)} accent />
            <Line label="Juros" value={brl(calc.totalJuros)} accent />
            <div className="border-t pt-3 mt-1 flex items-end justify-between">
              <span className="font-semibold">{multi ? `Total (${boletos.length} boletos)` : 'Total a pagar'}</span>
              <span className="text-2xl font-bold tracking-tight">{brl(calc.totalGeral)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            Preencha valor e vencimento para calcular.
          </p>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? 'font-medium text-amber-600 dark:text-amber-500' : 'font-medium'}>{value}</span>
    </div>
  );
}
