import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
  const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
  return diff;
}

export function BoletoTool() {
  const today = new Date().toISOString().slice(0, 10);
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [pagamento, setPagamento] = useState(today);
  const [multaPct, setMultaPct] = useState('2');
  const [jurosPct, setJurosPct] = useState('1'); // ao mês

  const r = useMemo(() => {
    const original = parseMoney(valor);
    const dias = daysBetween(vencimento, pagamento);
    const atraso = Math.max(0, dias);
    const multa = original * (parseFloat(multaPct || '0') / 100);
    const jurosDia = parseFloat(jurosPct || '0') / 100 / 30; // pro-rata die
    const juros = original * jurosDia * atraso;
    const total = original + (atraso > 0 ? multa + juros : 0);
    return { original, atraso, multa, juros, total, temAtraso: atraso > 0 && original > 0 };
  }, [valor, vencimento, pagamento, multaPct, jurosPct]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4">
        <Field label="Valor original do boleto">
          <Input
            inputMode="decimal"
            placeholder="Ex: 1.500,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Vencimento">
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </Field>
          <Field label="Data do pagamento">
            <Input type="date" value={pagamento} onChange={(e) => setPagamento(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Multa (%)" hint="única, sobre o valor">
            <Input inputMode="decimal" value={multaPct} onChange={(e) => setMultaPct(e.target.value)} />
          </Field>
          <Field label="Juros (% ao mês)" hint="pro-rata por dia">
            <Input inputMode="decimal" value={jurosPct} onChange={(e) => setJurosPct(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/40 p-5 space-y-2.5">
        {r.original > 0 && vencimento ? (
          <>
            {r.atraso > 0 ? (
              <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                {r.atraso} {r.atraso === 1 ? 'dia' : 'dias'} em atraso
              </p>
            ) : (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
                Dentro do prazo — sem encargos
              </p>
            )}
            <Line label="Valor original" value={brl(r.original)} />
            {r.temAtraso && (
              <>
                <Line label={`Multa (${multaPct || 0}%)`} value={brl(r.multa)} />
                <Line label={`Juros (${jurosPct || 0}% a.m.)`} value={brl(r.juros)} />
              </>
            )}
            <div className="border-t pt-2.5 mt-2 flex items-center justify-between">
              <span className="font-semibold">Total a pagar</span>
              <span className="text-xl font-bold">{brl(r.total)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Preencha o valor e o vencimento para calcular.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm">{label}</Label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
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
