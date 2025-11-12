import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2, TrendingDown } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DefaultWidget() {
  const { data: defaultData, isLoading } = useQuery({
    queryKey: ['default-widget'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data: overdueReceivables, error } = await supabase
        .from('accounts_receivable')
        .select('amount, due_date, client:clients(full_name, responsible_name, company_name, client_type)')
        .eq('status', 'overdue')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const totalOverdue = overdueReceivables?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalClients = new Set(overdueReceivables?.map((item: any) => item.client?.id)).size;

      // Calcular aging
      const overdueWithAging = overdueReceivables?.map(item => {
        const daysOverdue = differenceInDays(new Date(), new Date(item.due_date));
        let agingCategory = '0-30';
        if (daysOverdue > 90) agingCategory = '90+';
        else if (daysOverdue > 60) agingCategory = '60-90';
        else if (daysOverdue > 30) agingCategory = '30-60';

        return { ...item, daysOverdue, agingCategory };
      });

      const agingData = [
        {
          range: '0-30',
          value: overdueWithAging?.filter(i => i.agingCategory === '0-30').reduce((s, i) => s + Number(i.amount), 0) || 0,
        },
        {
          range: '30-60',
          value: overdueWithAging?.filter(i => i.agingCategory === '30-60').reduce((s, i) => s + Number(i.amount), 0) || 0,
        },
        {
          range: '60-90',
          value: overdueWithAging?.filter(i => i.agingCategory === '60-90').reduce((s, i) => s + Number(i.amount), 0) || 0,
        },
        {
          range: '90+',
          value: overdueWithAging?.filter(i => i.agingCategory === '90+').reduce((s, i) => s + Number(i.amount), 0) || 0,
        },
      ].filter(item => item.value > 0);

      return {
        totalOverdue,
        totalClients,
        totalCount: overdueReceivables?.length || 0,
        agingData,
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Inadimplência
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Inadimplência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total em Atraso</p>
            <p className="text-lg font-bold text-red-600">
              R$ {defaultData?.totalOverdue.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Contas</p>
            <p className="text-lg font-bold">{defaultData?.totalCount}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="w-4 h-4" />
              Clientes
            </div>
            <p className="text-lg font-bold">{defaultData?.totalClients}</p>
          </div>
        </div>

        {defaultData?.agingData && defaultData.agingData.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Aging de Inadimplência (dias)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={defaultData.agingData}>
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`} />
                <Bar dataKey="value" fill="#DC2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
