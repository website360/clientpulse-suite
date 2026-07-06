import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Store, ShoppingBag, Handshake, Search, Loader2, MapPin } from 'lucide-react';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function num(v: string): number {
  const n = parseFloat((v || '0').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Aceita ponto ou vírgula como separador decimal (números pequenos, sem milhar)
function dec(v: string): number {
  const n = parseFloat((v || '0').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Potência média (W) consumida durante a impressão, por modelo
const PRINTERS = [
  { id: 'a1', name: 'Bambu Lab A1', w: 95 },
  { id: 'a1mini', name: 'Bambu Lab A1 mini', w: 55 },
  { id: 'p1', name: 'Bambu Lab P1P / P1S', w: 110 },
  { id: 'x1', name: 'Bambu Lab X1 / X1 Carbon', w: 130 },
  { id: 'ender3', name: 'Creality Ender 3 (V2/V3)', w: 120 },
  { id: 'k1', name: 'Creality K1 / K1 Max', w: 150 },
  { id: 'prusamk', name: 'Prusa MK3 / MK4', w: 90 },
  { id: 'prusamini', name: 'Prusa Mini', w: 50 },
  { id: 'anycubic', name: 'Anycubic Kobra', w: 110 },
  { id: 'elegoo', name: 'Elegoo Neptune', w: 110 },
  { id: 'outra', name: 'Outra (informar potência)', w: 0 },
];

// Tarifa residencial média por UF (R$/kWh, com impostos, bandeira verde) — estimativa editável
const TARIFA_UF: Record<string, number> = {
  AC: 0.82, AL: 0.96, AM: 0.90, AP: 0.78, BA: 0.93, CE: 0.84, DF: 0.80,
  ES: 0.87, GO: 0.92, MA: 0.89, MG: 0.95, MS: 0.92, MT: 0.97, PA: 0.94,
  PB: 0.87, PE: 0.88, PI: 0.89, PR: 0.82, RJ: 1.03, RN: 0.89, RO: 0.86,
  RR: 0.74, RS: 0.90, SC: 0.79, SE: 0.89, SP: 0.84, TO: 0.91,
};

// Acréscimo por bandeira tarifária (R$/kWh) — valores oficiais ANEEL, nacionais
const BANDEIRAS = [
  { id: 'verde', name: 'Verde (sem acréscimo)', add: 0 },
  { id: 'amarela', name: 'Amarela (+R$ 0,01885)', add: 0.01885 },
  { id: 'vermelha1', name: 'Vermelha P1 (+R$ 0,04463)', add: 0.04463 },
  { id: 'vermelha2', name: 'Vermelha P2 (+R$ 0,07877)', add: 0.07877 },
];

export function Print3DTool() {
  // Filamento
  const [pesoPeca, setPesoPeca] = useState('30'); // g
  const [precoKg, setPrecoKg] = useState('100'); // R$/kg

  // Impressão
  const [horas, setHoras] = useState('2');
  const [minutos, setMinutos] = useState('30');
  const [printerId, setPrinterId] = useState('a1');
  const [potenciaManual, setPotenciaManual] = useState('100'); // W, quando "Outra"

  // Energia
  const [cep, setCep] = useState('');
  const [local, setLocal] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepErro, setCepErro] = useState('');
  const [tarifaBase, setTarifaBase] = useState('0,84'); // R$/kWh (base, sem bandeira)
  const [bandeiraId, setBandeiraId] = useState('verde');

  // Extras
  const [embalagem, setEmbalagem] = useState('2,50');
  const [falhaPct, setFalhaPct] = useState('8'); // % de peças perdidas/refugo

  // Lucro
  const [margemPct, setMargemPct] = useState('80');

  // Plataformas
  const [shopeeComissao, setShopeeComissao] = useState('20'); // %
  const [shopeeFixo, setShopeeFixo] = useState('4'); // R$/item
  const [mlComissao, setMlComissao] = useState('12'); // %
  const [mlFixo, setMlFixo] = useState('6'); // R$/item (abaixo de R$79)

  const printer = PRINTERS.find((p) => p.id === printerId) ?? PRINTERS[0];
  const potenciaW = printerId === 'outra' ? dec(potenciaManual) : printer.w;
  const bandeira = BANDEIRAS.find((b) => b.id === bandeiraId) ?? BANDEIRAS[0];
  const precoKwh = dec(tarifaBase) + bandeira.add;

  const buscarCep = async () => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepErro('Digite os 8 números do CEP.');
      return;
    }
    setLoadingCep(true);
    setCepErro('');
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
      if (!res.ok) {
        setCepErro('CEP não encontrado.');
        return;
      }
      const d = await res.json();
      const uf: string = d.state || '';
      setLocal([d.city, uf].filter(Boolean).join(' - '));
      if (TARIFA_UF[uf]) {
        setTarifaBase(TARIFA_UF[uf].toFixed(2).replace('.', ','));
      }
    } catch {
      setCepErro('Não foi possível consultar o CEP.');
    } finally {
      setLoadingCep(false);
    }
  };

  const calc = useMemo(() => {
    const peso = dec(pesoPeca);
    const custoFilamento = (peso / 1000) * num(precoKg);

    const tempoH = num(horas) + dec(minutos) / 60;
    const custoEnergia = (potenciaW / 1000) * tempoH * precoKwh;

    const custoEmbalagem = dec(embalagem);

    const subtotal = custoFilamento + custoEnergia + custoEmbalagem;

    // Refugo: rateia o custo das peças que falham sobre as boas
    const falha = dec(falhaPct) / 100;
    const custoFalha = falha < 1 ? subtotal * (falha / (1 - falha)) : 0;

    const custoTotal = subtotal + custoFalha;

    const lucro = custoTotal * (dec(margemPct) / 100);
    const alvoLiquido = custoTotal + lucro; // o que quero receber "no bolso"

    // Preço por canal: repassa a taxa da plataforma mantendo o mesmo lucro líquido
    const canal = (comissaoPct: number, fixo: number) => {
      const c = comissaoPct / 100;
      const preco = c < 1 ? (alvoLiquido + fixo) / (1 - c) : 0;
      const taxaPlataforma = preco * c + fixo;
      const lucroLiquido = preco - custoTotal - taxaPlataforma;
      const margemSobreVenda = preco > 0 ? (lucroLiquido / preco) * 100 : 0;
      return { preco, taxaPlataforma, lucroLiquido, margemSobreVenda };
    };

    return {
      custoFilamento,
      custoEnergia,
      custoEmbalagem,
      custoFalha,
      custoTotal,
      lucro,
      tempoH,
      direta: canal(0, 0),
      shopee: canal(dec(shopeeComissao), dec(shopeeFixo)),
      ml: canal(dec(mlComissao), dec(mlFixo)),
    };
  }, [
    pesoPeca, precoKg, horas, minutos, potenciaW, precoKwh,
    embalagem, falhaPct, margemPct,
    shopeeComissao, shopeeFixo, mlComissao, mlFixo,
  ]);

  return (
    <div className="space-y-6">
      {/* Filamento */}
      <Section title="Filamento">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso da peça" suffix="g">
            <Input inputMode="decimal" value={pesoPeca} onChange={(e) => setPesoPeca(e.target.value)} />
          </Field>
          <Field label="Preço do filamento" suffix="R$/kg">
            <Input inputMode="decimal" value={precoKg} onChange={(e) => setPrecoKg(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Impressão */}
      <Section title="Impressão">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Impressora">
            <Select value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
              {PRINTERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.w ? ` — ${p.w} W` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tempo de impressão">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input inputMode="numeric" value={horas} onChange={(e) => setHoras(e.target.value)} className="pr-7" />
                <Suffix>h</Suffix>
              </div>
              <div className="relative flex-1">
                <Input inputMode="numeric" value={minutos} onChange={(e) => setMinutos(e.target.value)} className="pr-9" />
                <Suffix>min</Suffix>
              </div>
            </div>
          </Field>
          {printerId === 'outra' && (
            <Field label="Potência média" suffix="W">
              <Input inputMode="decimal" value={potenciaManual} onChange={(e) => setPotenciaManual(e.target.value)} />
            </Field>
          )}
        </div>
      </Section>

      {/* Energia */}
      <Section title="Energia elétrica">
        <Field label="CEP (preenche a tarifa da sua região)">
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              placeholder="00000-000"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarCep()}
            />
            <Button onClick={buscarCep} disabled={loadingCep} variant="outline" className="flex-shrink-0">
              {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </Field>
        {local && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {local}
          </p>
        )}
        {cepErro && <p className="text-[11px] text-destructive">{cepErro}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarifa base" suffix="R$/kWh">
            <Input inputMode="decimal" value={tarifaBase} onChange={(e) => setTarifaBase(e.target.value)} />
          </Field>
          <Field label="Bandeira tarifária">
            <Select value={bandeiraId} onChange={(e) => setBandeiraId(e.target.value)}>
              {BANDEIRAS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tarifa efetiva: <span className="font-medium text-foreground">{brl(precoKwh)}/kWh</span>. A bandeira é nacional e muda mensalmente — confirme a vigente na sua conta de luz.
        </p>
      </Section>

      {/* Extras */}
      <Section title="Acabamento & extras">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Embalagem" suffix="R$">
            <Input inputMode="decimal" value={embalagem} onChange={(e) => setEmbalagem(e.target.value)} />
          </Field>
          <Field label="Taxa de falha/refugo" suffix="%">
            <Input inputMode="decimal" value={falhaPct} onChange={(e) => setFalhaPct(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Custo total */}
      <section className="rounded-xl border bg-muted/40 p-5 space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Custo de produção
        </p>
        <Line label="Filamento" value={brl(calc.custoFilamento)} />
        <Line label={`Energia (${potenciaW} W · ${calc.tempoH.toFixed(1)} h)`} value={brl(calc.custoEnergia)} />
        <Line label="Embalagem" value={brl(calc.custoEmbalagem)} />
        <Line label="Rateio de falhas" value={brl(calc.custoFalha)} />
        <div className="border-t pt-3 mt-1 flex items-end justify-between">
          <span className="font-semibold">Custo total por peça</span>
          <span className="text-xl font-bold tracking-tight">{brl(calc.custoTotal)}</span>
        </div>
      </section>

      {/* Lucro */}
      <Section title="Margem de lucro">
        <Field label="Lucro desejado sobre o custo" suffix="%">
          <Input inputMode="decimal" value={margemPct} onChange={(e) => setMargemPct(e.target.value)} />
        </Field>
        <p className="text-[11px] text-muted-foreground">
          Lucro-alvo por peça: <span className="font-medium text-foreground">{brl(calc.lucro)}</span>. As taxas de cada plataforma são somadas ao preço para você receber esse lucro líquido em todos os canais.
        </p>
      </Section>

      {/* Taxas das plataformas */}
      <Section title="Taxas das plataformas">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shopee — comissão" suffix="%">
            <Input inputMode="decimal" value={shopeeComissao} onChange={(e) => setShopeeComissao(e.target.value)} />
          </Field>
          <Field label="Shopee — taxa por item" suffix="R$">
            <Input inputMode="decimal" value={shopeeFixo} onChange={(e) => setShopeeFixo(e.target.value)} />
          </Field>
          <Field label="Mercado Livre — comissão" suffix="%">
            <Input inputMode="decimal" value={mlComissao} onChange={(e) => setMlComissao(e.target.value)} />
          </Field>
          <Field label="Mercado Livre — taxa fixa" suffix="R$">
            <Input inputMode="decimal" value={mlFixo} onChange={(e) => setMlFixo(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Preços sugeridos por canal */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Preço de venda sugerido
        </p>
        <ChannelCard
          icon={Handshake}
          name="Venda direta"
          hint="Sem taxas de marketplace"
          data={calc.direta}
        />
        <ChannelCard
          icon={ShoppingBag}
          name="Shopee"
          hint={`Comissão ${num(shopeeComissao)}% + ${brl(dec(shopeeFixo))}/item`}
          data={calc.shopee}
        />
        <ChannelCard
          icon={Store}
          name="Mercado Livre"
          hint={`Comissão ${num(mlComissao)}% + ${brl(dec(mlFixo))} fixo`}
          data={calc.ml}
        />
      </section>
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  name,
  hint,
  data,
}: {
  icon: React.ElementType;
  name: string;
  hint: string;
  data: { preco: number; taxaPlataforma: number; lucroLiquido: number; margemSobreVenda: number };
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-tight leading-none">{brl(data.preco)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">preço de venda</p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x border-t bg-muted/30 text-center">
        <Cell label="Taxa" value={brl(data.taxaPlataforma)} />
        <Cell
          label="Lucro líquido"
          value={brl(data.lucroLiquido)}
          className="text-emerald-600 dark:text-emerald-500"
        />
        <Cell label="Margem s/ venda" value={`${data.margemSobreVenda.toFixed(0)}%`} />
      </div>
    </div>
  );
}

function Cell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="py-2.5 px-2">
      <p className={`text-sm font-semibold ${className ?? ''}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function Field({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {suffix && <span className="text-muted-foreground/60"> ({suffix})</span>}
      </Label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </select>
  );
}

function Suffix({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
      {children}
    </span>
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
