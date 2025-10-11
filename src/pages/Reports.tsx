import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinancialReportFilters from '@/components/reports/FinancialReportFilters';
import FinancialReportTable from '@/components/reports/FinancialReportTable';
import { FileText } from 'lucide-react';

export type ReportType = 'payable' | 'receivable';
export type ReportStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export interface FinancialReportFilters {
  reportType: ReportType;
  status: ReportStatus[];
  categories: string[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  paymentMethods: string[];
  clientId: string;
  supplierId: string;
}

export default function Reports() {
  const [filters, setFilters] = useState<FinancialReportFilters>({
    reportType: 'payable',
    status: [],
    categories: [],
    startDate: undefined,
    endDate: undefined,
    paymentMethods: [],
    clientId: 'all',
    supplierId: 'all',
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Gere relatórios detalhados e exporte dados
            </p>
          </div>
        </div>

        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList>
            <TabsTrigger value="financial">Relatório Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatório Financeiro</CardTitle>
                <CardDescription>
                  Filtre e exporte dados de contas a pagar e receber
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FinancialReportFilters filters={filters} setFilters={setFilters} />
                <FinancialReportTable filters={filters} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
