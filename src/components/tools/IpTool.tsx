import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface IpInfo {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  org?: string;
}

export function IpTool() {
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchIp = async () => {
    setLoading(true);
    setError(false);
    try {
      // ipapi.co retorna IP + geolocalização aproximada em uma única chamada
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('falha');
      const data = await res.json();
      setInfo({
        ip: data.ip,
        city: data.city,
        region: data.region,
        country_name: data.country_name,
        org: data.org,
      });
    } catch {
      // Fallback: apenas o IP
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        setInfo({ ip: data.ip });
      } catch {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIp();
  }, []);

  const copyIp = () => {
    if (!info?.ip) return;
    navigator.clipboard.writeText(info.ip);
    toast({ title: 'IP copiado!', description: info.ip });
  };

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            Não foi possível descobrir o IP. Verifique sua conexão.
          </p>
          <Button variant="outline" onClick={fetchIp} className="hover:bg-muted hover:text-foreground">
            <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border bg-gradient-to-b from-primary/5 to-muted/40 p-7 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Seu IP público
            </p>
            <p className="text-3xl font-bold tracking-tight break-all">{info?.ip}</p>
            <Button variant="outline" size="sm" className="mt-4 hover:bg-muted hover:text-foreground" onClick={copyIp}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar IP
            </Button>
          </div>

          {(info?.city || info?.org) && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {info?.city && (
                <InfoRow label="Cidade" value={`${info.city}${info.region ? ` - ${info.region}` : ''}`} />
              )}
              {info?.country_name && <InfoRow label="País" value={info.country_name} />}
              {info?.org && <InfoRow label="Provedor" value={info.org} full />}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center">
            A localização é aproximada, baseada no provedor de internet.
          </p>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-3 ${full ? 'col-span-2' : ''}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5 break-words">{value}</p>
    </div>
  );
}
