import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, XCircle, Copy, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d = 11 - (sum % 11);
  if (d >= 10) d = 0;
  if (d !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  d = 11 - (sum % 11);
  if (d >= 10) d = 0;
  return d === parseInt(cpf[10]);
}

function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(cnpj[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(cnpj[12]) && calc(13) === parseInt(cnpj[13]);
}

export function ValidatorTool() {
  return (
    <div className="space-y-7">
      <DocValidator />
      <PasswordGenerator />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  );
}

function DocValidator() {
  const [value, setValue] = useState('');
  const status = useMemo(() => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return null;
    if (digits.length <= 11) {
      if (digits.length < 11) return 'incompleto';
      return validateCPF(digits) ? 'valid-cpf' : 'invalid';
    }
    if (digits.length < 14) return 'incompleto';
    return validateCNPJ(digits) ? 'valid-cnpj' : 'invalid';
  }, [value]);

  const ok = status === 'valid-cpf' || status === 'valid-cnpj';

  return (
    <section className="space-y-3">
      <SectionLabel>Validar CPF ou CNPJ</SectionLabel>
      <div className="relative">
        <Input
          inputMode="numeric"
          placeholder="Digite o CPF ou CNPJ"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pr-10"
        />
        {ok && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
        )}
        {status === 'invalid' && (
          <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
        )}
      </div>
      {status && status !== 'incompleto' && (
        <p
          className={`text-sm font-medium ${
            status === 'invalid' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-500'
          }`}
        >
          {status === 'invalid'
            ? 'Documento inválido'
            : status === 'valid-cpf'
            ? 'CPF válido'
            : 'CNPJ válido'}
        </p>
      )}
      {status === 'incompleto' && <p className="text-sm text-muted-foreground">Continue digitando…</p>}
    </section>
  );
}

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState('');

  const generate = () => {
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers) chars += '0123456789';
    if (symbols) chars += '!@#$%&*?-_=+';
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    let out = '';
    for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
    setPassword(out);
  };

  const copy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    toast({ title: 'Senha copiada!' });
  };

  return (
    <section className="space-y-4 border-t pt-6">
      <SectionLabel>Gerador de senha forte</SectionLabel>

      <div className="flex gap-2">
        <Input readOnly value={password} placeholder="Clique em gerar" className="font-mono tracking-wide" />
        <Button variant="outline" size="icon" className="flex-shrink-0" onClick={copy} disabled={!password}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" className="flex-shrink-0" onClick={generate}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Comprimento</span>
            <span className="text-sm font-semibold tabular-nums">{length}</span>
          </div>
          <Slider value={[length]} min={6} max={40} step={1} onValueChange={(v) => setLength(v[0])} />
        </div>

        <div className="grid grid-cols-1 gap-2.5 border-t pt-3">
          <Toggle label="Letras maiúsculas" checked={upper} onChange={setUpper} />
          <Toggle label="Números" checked={numbers} onChange={setNumbers} />
          <Toggle label="Símbolos" checked={symbols} onChange={setSymbols} />
        </div>
      </div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
