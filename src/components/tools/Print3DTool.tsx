import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, ShoppingBag, Handshake } from 'lucide-react';

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

export function Print3DTool() {
  // Filamento
  const [pesoPeca, setPesoPeca] = useState('30'); // g
  const [precoKg, setPrecoKg] = useState('120'); // R$/kg

  // Impressão
  const [horas, setHoras] = useState('2');
  const [minutos, setMinutos] = useState('30');
  const [potencia, setPotencia] = useState('150'); // W médios
  const [precoKwh, setPrecoKwh] = useState('0,95'); // R$/kWh

  // Depreciação da impressora
  const [valorImpressora, setValorImpressora] = useState('2500');
  const [vidaUtilH, setVidaUtilH] = useState('4000'); // horas de vida útil

  // Extras
  const [embalagem, setEmbalagem] = useState('2,50');
  const [maoObraHora, setMaoObraHora] = useState('20'); // R$/h de trabalho manual
  const [minsTrabalho, setMinsTrabalho] = useState('10'); // min de pós-processamento
  const [falhaPct, setFalhaPct] = useState('8'); // % de peças perdidas/refugo

  // Lucro
  const [margemPct, setMargemPct] = useState('80');

  // Plataformas
  const [shopeeComissao, setShopeeComissao] = useState('20'); // %
  const [shopeeFixo, setShopeeFixo] = useState('4'); // R$/item
  const [mlComissao, setMlComissao] = useState('12'); // %
  const [mlFixo, setMlFixo] = useState('6'); // R$/item (abaixo de R$79)

  const calc = useMemo(() => {
    const peso = dec(pesoPeca);
    const custoFilamento = (peso / 1000) * num(precoKg);

    const tempoH = num(horas) + dec(minutos) / 60;
    const custoEnergia = (dec(potencia) / 1000) * tempoH * dec(precoKwh);

    const vida = num(vidaUtilH);
    const custoDepreciacao = vida > 0 ? (num(valorImpressora) / vida) * tempoH : 0;

    const custoEmbalagem = dec(embalagem);
    const custoMaoObra = num(maoObraHora) * (dec(minsTrabalho) / 60);

    const subtotal =
      custoFilamento + custoEnergia + custoDepreciacao + custoEmbalagem + custoMaoObra;

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
      custoDepreciacao,
      custoEmbalagem,
      custoMaoObra,
      custoFalha,
      custoTotal,
      lucro,
      tempoH,
      direta: canal(0, 0),
      shopee: canal(dec(shopeeComissao), dec(shopeeFixo)),
      ml: canal(dec(mlComissao), dec(mlFixo)),
    };
  }, [
    pesoPeca, precoKg, horas, minutos, potencia, precoKwh, valorImpressora, vidaUtilH,
    embalagem, maoObraHora, minsTrabalho, falhaPct, margemPct,
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
          <Field label="Potência média" suffix="W">
            <Input inputMode="decimal" value={potencia} onChange={(e) => setPotencia(e.target.value)} />
          </Field>
          <Field label="Preço da energia" suffix="R$/kWh">
            <Input inputMode="decimal" value={precoKwh} onChange={(e) => setPrecoKwh(e.target.value)} />
          </Field>
          <Field label="Valor da impressora" suffix="R$">
            <Input inputMode="decimal" value={valorImpressora} onChange={(e) => setValorImpressora(e.target.value)} />
          </Field>
          <Field label="Vida útil da impressora" suffix="h">
            <Input inputMode="numeric" value={vidaUtilH} onChange={(e) => setVidaUtilH(e.target.value)} />
          </Field>
        </div>
        <p className="text-[11px] text-muted-foreground">
          A vida útil converte o valor da impressora em depreciação por hora impressa.
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
          <Field label="Mão de obra" suffix="R$/h">
            <Input inputMode="decimal" value={maoObraHora} onChange={(e) => setMaoObraHora(e.target.value)} />
          </Field>
          <Field label="Tempo de trabalho manual" suffix="min">
            <Input inputMode="numeric" value={minsTrabalho} onChange={(e) => setMinsTrabalho(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Custo total */}
      <section className="rounded-xl border bg-muted/40 p-5 space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Custo de produção
        </p>
        <Line label="Filamento" value={brl(calc.custoFilamento)} />
        <Line label="Energia" value={brl(calc.custoEnergia)} />
        <Line label="Depreciação da impressora" value={brl(calc.custoDepreciacao)} />
        <Line label="Embalagem" value={brl(calc.custoEmbalagem)} />
        <Line label="Mão de obra" value={brl(calc.custoMaoObra)} />
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
