import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
import FinancialReportFilters from '@/components/reports/FinancialReportFilters';
import FinancialReportTable from '@/components/reports/FinancialReportTable';
import ProductivityReport from '@/components/reports/ProductivityReport';
import TicketsReport from '@/components/reports/TicketsReport';
import DefaultReport from '@/components/reports/DefaultReport';
import { FileText, TrendingUp, Ticket, AlertTriangle } from 'lucide-react';

export type ReportType = 'payable' | 'receivable' | '';
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
  const [activeTab, setActiveTab] = useState('financial');
  const [filters, setFilters] = useState<FinancialReportFilters>({
    reportType: '',
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

        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="financial" className="space-y-6">
          <ScrollableTabs>
            <TabsList>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="productivity" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Produtividade
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Tickets
              </TabsTrigger>
              <TabsTrigger value="defaults" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Inadimplência
              </TabsTrigger>
            </TabsList>
          </ScrollableTabs>

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

          <TabsContent value="productivity" className="space-y-6">
            <ProductivityReport />
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <TicketsReport />
          </TabsContent>

          <TabsContent value="defaults" className="space-y-6">
            <DefaultReport />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
