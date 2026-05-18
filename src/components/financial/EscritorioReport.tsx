import { useState } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFinancialAccount } from '@/contexts/FinancialAccountContext';

function startOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function endOfMonthStr() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}
function formatCurrencyForSheet(v: number) {
  return Number(v.toFixed(2));
}
function ptDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  // dateStr é 'YYYY-MM-DD' — adiciona T00:00 para evitar shift de timezone
  return format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Botão + dialog que exporta um relatório XLSX para a conta selecionada.
 * Contém 3 abas: Resumo, Entradas, Saídas.
 */
export function EscritorioReport() {
  const { selectedAccountId, selectedAccount } = useFinancialAccount();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(startOfMonthStr());
  const [dateTo, setDateTo] = useState(endOfMonthStr());

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Selecione o período');
      return;
    }
    if (dateFrom > dateTo) {
      toast.error('A data inicial não pode ser maior que a final');
      return;
    }

    setLoading(true);
    try {
      // ENTRADAS — accounts_receivable com status='received', payment_date no período
      let entradasQuery = supabase
        .from('accounts_receivable')
        .select('payment_date, description, payer_name, category, payment_method, amount, client:clients(full_name, company_name, responsible_name, client_type)')
        .eq('status', 'received')
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .order('payment_date', { ascending: true });
      if (selectedAccountId !== 'all') {
        entradasQuery = entradasQuery.eq('financial_account_id', selectedAccountId);
      }

      // SAÍDAS — accounts_payable com status='paid', payment_date no período
      let saidasQuery = supabase
        .from('accounts_payable')
        .select('payment_date, description, payee_name, category, payment_method, amount, supplier:suppliers(name)')
        .eq('status', 'paid')
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .order('payment_date', { ascending: true });
      if (selectedAccountId !== 'all') {
        saidasQuery = saidasQuery.eq('financial_account_id', selectedAccountId);
      }

      const [entradasRes, saidasRes] = await Promise.all([entradasQuery, saidasQuery]);
      if (entradasRes.error) throw entradasRes.error;
      if (saidasRes.error) throw saidasRes.error;

      const entradas = (entradasRes.data || []).map((r: any) => {
        const clientName = r.client?.responsible_name
          || (r.client?.client_type === 'company' ? r.client?.company_name : r.client?.full_name)
          || r.payer_name
          || '';
        return {
          Data: ptDate(r.payment_date),
          Recebedor: clientName,
          Descrição: r.description || '',
          Categoria: r.category || '',
          'Forma de Pagamento': r.payment_method || '',
          Valor: formatCurrencyForSheet(Number(r.amount) || 0),
        };
      });

      const saidas = (saidasRes.data || []).map((r: any) => ({
        Data: ptDate(r.payment_date),
        Beneficiário: r.supplier?.name || r.payee_name || '',
        Descrição: r.description || '',
        Categoria: r.category || '',
        'Forma de Pagamento': r.payment_method || '',
        Valor: formatCurrencyForSheet(Number(r.amount) || 0),
      }));

      const totalEntradas = entradas.reduce((s, r) => s + r.Valor, 0);
      const totalSaidas = saidas.reduce((s, r) => s + r.Valor, 0);
      const saldo = totalEntradas - totalSaidas;

      const wb = XLSX.utils.book_new();

      // Aba Resumo
      const resumoAOA = [
        ['Conta', selectedAccount?.name || 'Todas as contas'],
        ['Período', `${ptDate(dateFrom)} — ${ptDate(dateTo)}`],
        [],
        ['Total Entradas', totalEntradas],
        ['Total Saídas', totalSaidas],
        ['Saldo', saldo],
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoAOA);
      wsResumo['!cols'] = [{ wch: 22 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

      // Aba Entradas
      if (entradas.length > 0) {
        const wsEntradas = XLSX.utils.json_to_sheet(entradas);
        wsEntradas['!cols'] = [
          { wch: 12 }, { wch: 28 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(wb, wsEntradas, 'Entradas');
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sem entradas no período']]), 'Entradas');
      }

      // Aba Saídas
      if (saidas.length > 0) {
        const wsSaidas = XLSX.utils.json_to_sheet(saidas);
        wsSaidas['!cols'] = [
          { wch: 12 }, { wch: 28 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(wb, wsSaidas, 'Saídas');
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sem saídas no período']]), 'Saídas');
      }

      const filename = `Relatorio_${(selectedAccount?.name || 'todas').replace(/\s+/g, '_')}_${dateFrom}_${dateTo}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success(`Relatório gerado: ${entradas.length} entradas, ${saidas.length} saídas`);
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Exportar Relatório
      </Button>

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Exportar Relatório</DialogTitle>
            <DialogDescription>
              Gera uma planilha (.xlsx) com Entradas, Saídas e Resumo do período da conta selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="report-from">De</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-to">Até</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Conta: <strong>{selectedAccount?.name || 'Todas as contas'}</strong>
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Gerar Planilha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
